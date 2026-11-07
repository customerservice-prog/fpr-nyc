import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile, mkdtemp, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

test('the actual Resend transport forwards idempotency and rejects conflicts', async () => {
  const source = await readFile('lib/email.ts', 'utf8')
  const start = source.indexOf('async function sendWithResend(')
  const end = source.indexOf('\nexport async function sendEmail', start)
  assert.ok(start >= 0 && end > start, 'expected Resend transport exists')
  const fragment = source.slice(start, end).replace('async function sendWithResend', 'export async function sendWithResend')
  const dir = await mkdtemp(join(tmpdir(), 'nyc-resend-test-'))
  const file = join(dir, 'resend.ts')
  await writeFile(file, "const NYC_EMAIL_SITE_HOST = 'example.test'\n" + fragment)
  const oldFetch = globalThis.fetch, oldKey = process.env.RESEND_API_KEY, oldFrom = process.env.RESEND_FROM
  process.env.RESEND_API_KEY = 'test-key'; process.env.RESEND_FROM = 'sender@example.test'
  let request
  globalThis.fetch = async (url, options) => { request = {url, options}; return {ok: true, json: async () => ({id: 'test-message'})} }
  const email = {to:'recipient@example.test',subject:'test',html:'<p>test</p>',text:'test',replyTo:'reply@example.test',idempotencyKey:'balance-reminder/order-1/2027-01-03'}
  try {
    const { sendWithResend } = await import(pathToFileURL(file).href)
    const result = await sendWithResend(email)
    assert.equal(result.providerId, 'test-message')
    assert.equal(request.options.headers['Idempotency-Key'], email.idempotencyKey)
    globalThis.fetch = async () => ({ok:false,status:409,text:async()=> 'conflict'})
    await assert.rejects(() => sendWithResend(email), /Resend rejected the message \(409\)/)
  } finally {
    globalThis.fetch = oldFetch
    if (oldKey === undefined) delete process.env.RESEND_API_KEY; else process.env.RESEND_API_KEY = oldKey
    if (oldFrom === undefined) delete process.env.RESEND_FROM; else process.env.RESEND_FROM = oldFrom
    await rm(dir, {recursive:true,force:true})
  }
})
