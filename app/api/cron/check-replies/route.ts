export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import * as tls from 'tls'

// Automatically pauses quote follow-up emails for an order once the customer has replied
// to any of our emails. This app has no dedicated inbound-email/webhook service configured,
// so this connects directly via IMAP to the same Gmail mailbox already used for sending
// (reusing EMAIL_USER / EMAIL_PASS) and checks, per pending order, whether that customer has
// sent us any email recently. Requires IMAP access enabled on the Gmail account
// (Gmail Settings > Forwarding and POP/IMAP > Enable IMAP).

const IMAP_HOST = process.env.EMAIL_IMAP_HOST || 'imap.gmail.com'
const IMAP_PORT = parseInt(process.env.EMAIL_IMAP_PORT || '993')
const LOOKBACK_DAYS = 10
const SOCKET_TIMEOUT_MS = 20000


function imapQuote(value: string) {
      return '"' + value.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"'
}

function imapDate(d: Date) {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      return d.getDate() + '-' + months[d.getMonth()] + '-' + d.getFullYear()
}

function connectImap(): Promise<tls.TLSSocket> {
      return new Promise((resolve, reject) => {
              const socket = tls.connect({ host: IMAP_HOST, port: IMAP_PORT, servername: IMAP_HOST }, () => resolve(socket))
              socket.setTimeout(SOCKET_TIMEOUT_MS, () => { socket.destroy(new Error('IMAP socket timed out')) })
              socket.once('error', reject)
      })
}

function waitForTag(socket: tls.TLSSocket, tag: string): Promise<string> {
      return new Promise((resolve, reject) => {
              let buffer = ''
              const onData = (chunk: Buffer) => {
                        buffer += chunk.toString('binary')
                        if (new RegExp('(^|\\r\\n)' + tag + ' (OK|NO|BAD)').test(buffer)) {
                                    cleanup()
                                    resolve(buffer)
                        }
              }
              const onError = (err: Error) => { cleanup(); reject(err) }
              const cleanup = () => {
                        socket.removeListener('data', onData)
                        socket.removeListener('error', onError)
              }
              socket.on('data', onData)
              socket.once('error', onError)
      })
}

async function imapCommand(socket: tls.TLSSocket, tag: string, command: string) {
      socket.write(tag + ' ' + command + '\r\n')
      return waitForTag(socket, tag)
}

async function hasRepliedSince(socket: tls.TLSSocket, email: string, since: Date, tagCounter: { n: number }) {
      const tag = 'S' + ++tagCounter.n
      const command = 'SEARCH SINCE ' + imapDate(since) + ' FROM ' + imapQuote(email)
      const response = await imapCommand(socket, tag, command)
      const searchLine = /\* SEARCH([^\r\n]*)\r\n/.exec(response)
      if (!searchLine) return false
      return searchLine[1].trim().length > 0
}

export async function GET(request: NextRequest) {
      const authHeader = request.headers.get('authorization')
      const cronSecret = process.env.CRON_SECRET
      if (!cronSecret || authHeader !== 'Bearer ' + cronSecret) {
              return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
          return NextResponse.json({ skipped: true, reason: 'Email not configured' })
  }
    

  const candidates = await prisma.order.findMany({
            where: {
                        status: 'quote',
                        followUpsPaused: false,
                        OR: [
                              { incompleteFollowUpSentAt: { not: null } },
                              { incompleteFollowUp3SentAt: { not: null } },
                              { incompleteFollowUp7SentAt: { not: null } },
                                    ],
            },
            include: { customer: true },
  })
      

  const withEmail = candidates.filter((order) => order.customer?.email)
        if (withEmail.length === 0) {
                  return NextResponse.json({ checked: 0, paused: 0 })
        }
      

  const since = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000)
        const tagCounter = { n: 0 }
        let socket: tls.TLSSocket | null = null

  try {
            socket = await connectImap()

          const loginTag = 'A' + ++tagCounter.n
            const loginResponse = await imapCommand(socket, loginTag, 'LOGIN ' + imapQuote(process.env.EMAIL_USER) + ' ' + imapQuote(process.env.EMAIL_PASS))
            if (!new RegExp(loginTag + ' OK').test(loginResponse)) {
                        throw new Error('IMAP login failed - check that IMAP is enabled on the mailbox')
            }

          const selectTag = 'A' + ++tagCounter.n
            await imapCommand(socket, selectTag, 'SELECT INBOX')

          let pausedCount = 0
            for (const order of withEmail) {
                        const email = order.customer!.email as string
                        const replied = await hasRepliedSince(socket, email, since, tagCounter)
                        if (replied) {
                                      await prisma.order.update({ where: { id: order.id }, data: { followUpsPaused: true } })
                                      pausedCount++
                        }
            }

          const logoutTag = 'A' + ++tagCounter.n
            await imapCommand(socket, logoutTag, 'LOGOUT').catch(() => {})
            socket.end()

          return NextResponse.json({ checked: withEmail.length, paused: pausedCount })
  } catch (err) {
            if (socket) {
                        try { socket.destroy() } catch {}
            }
            console.error('check-replies cron error', err)
            return NextResponse.json({ error: 'IMAP error', message: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}
