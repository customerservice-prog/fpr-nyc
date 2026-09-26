import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// One-time backfill of real customer emails migrated from ERS.
// Source of truth: ERS (315.ourers.com), matched to app customers by phone number.
// SAFETY: only updates customers whose current email is still a placeholder
// (contains '@imported.friendlypartyrental.local'). Never overwrites a real email.
// Idempotent: re-running only affects rows that still have a placeholder email.
const EMAIL_BY_PHONE: [string, string][] = [
  ['315-414-6246', 'johneshacardwel1@gmail.com'],
  ['315-559-7641', 'melissaw.jzp@gmail.com'],
  ['315-492-1752', 'amadely@iuoe158.org'],
  ['315-480-4295', 'dlcrosby06@hotmail.com'],
  ['315-263-6443', 'kelly.higgins1014@gmail.com'],
  ['315-278-1839', 'tmcq31@gmail.com'],
  ['315-657-5720', 'pdimatteo@twcny.rr.com'],
  ['315-527-0233', 'wood51871@yahoo.com'],
  ['315-506-3713', 'AmirMaki2000@gmail.com'],
  ['315-374-4074', 'kristymfasulo@gmail.com'],
  ['315-430-4446', 'erin.kleinhans@gmail.com'],
  ['631-681-3475', 'jennifer.titmus@gmail.com'],
  ['631-388-0846', 'justin.zale@sgws.com'],
  ['315-457-6681', 'ncpolachek@gmail.com'],
  ['315-247-9107', 'amagardner1@gmail.com'],
  ['315-439-3223', 'catkimono@hotmail.com'],
  ['315-882-0901', 'gillmore.chris1@gmail.com'],
  ['315-516-4661', 'kaitlynwheeler98@outlook.com'],
  ['315-256-6955', 'avburgdoff@yahoo.com'],
  ['315-491-0485', 'jenniekaroleski25@gmail.com'],
  ['315-436-9917', 'dcolangelo44@gmail.com'],
  ['315-430-0482', 'brad.harris11@gmail.com'],
  ['315-882-2087', 'ekolceski@gmail.com'],
  ['315-727-4129', 'Edisaalemic@gmail.com'],
  ['315-399-8072', 'allison.virnoche@gmail.com'],
  ['937-604-9133', 'agunderson75@gmail.com'],
  ['315-926-7140', 'Quinnika@dresplacellc.com'],
  ['315-427-3803', 'Maryannmurray1455@gmail.com'],
  ['845-901-2835', 'freemanwedding26@gmail.com'],
  ['607-643-6957', 'lauraharmon34@gmail.com'],
  ['315-569-2747', 'tnthann@gmail.com'],
  ['315-546-3474', 'Kjc524@hotmail.com'],
  ['315-725-5679', 'bedewieds@gmail.com'],
  ['315-439-6439', 'lynnmccaff88@gmail.com'],
  ['347-703-4847', 'marlowembriggs@gmail.com'],
  ['315-430-3904', 'lydiaenevin@gmail.com'],
  ['315-247-1477', 'Mgrevelding0901@gmail.com'],
  ['315-415-4129', 'smilnamow1@gmail.com'],
  ['716-327-1817', 'burdzybo@gmail.com'],
  ['315-335-6732', 'Kwalker4@oswego.edu'],
  ['315-506-3151', 'dave.zeleznock@gmail.com'],
  ['315-243-6351', 'mrutkows@outlook.com'],
  ['315-727-4213', 'jhonig@twcny.rr.com'],
  ['917-498-2395', 'bart.winnowicz@gmail.com'],
  ['315-243-0919', 'markacolvin@gmail.com'],
  ['315-952-5243', 'scapejazz@gmail.com'],
  ['617-564-6838', 'nsugarma@syr.edu'],
  ['315-560-1799', 'eiliswbyrnes@gmail.com'],
  ['518-222-6286', 'libby.howe@gmail.com'],
  ['315-657-3899', 'jimdrake2013@gmail.com'],
  ['315-447-2000', 'grake913@gmail.com'],
  ['321-330-8879', 'victoriashirley95@icloud.com'],
  ['315-813-1105', 'courtneyparisou@gmail.com'],
  ['315-491-9106', 'bonnie.cny@gmail.com'],
  ['315-435-2157', 'sjackoway@cnyarts.org'],
  ['415-380-9275', 'Angeladunn6055@gmail.com'],
  ['315-380-1245', 'klipp3@hotmail.com'],
  ['513-293-5390', 'angela@radakovichfamily.com'],
  ['240-304-1969', 'erin@micagroup.org'],
  ['315-679-6143', 'solomon.barron@nationalgrid.com'],
  ['703-967-2478', 'jkcorn11@gmail.com'],
  ['315-247-8416', 'zacdukat@gmail.com'],
  ['315-720-4656', 'Llw_13@hotmail.com'],
  ['406-871-7757', 'pbam2026@gmail.com'],
  ['480-677-1440', 'ericaglimmerglass@yahoo.com'],
  ['315-530-5817', 'larissa_brenner@yahoo.com'],
  ['315-415-5164', 'amandamarkham33@yahoo.com'],
  ['315-727-0958', 'bgnacik@gmail.com'],
  ['321-525-0672', 'allie@celebrationsbyallie.com'],
  ['907-351-7411', 'dianneblumer@gmail.com'],
]

const PLACEHOLDER = '@imported.friendlypartyrental.local'

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any)?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const updated: { phone: string; email: string; count: number }[] = []
    const skipped: { phone: string; reason: string }[] = []

    for (const [phone, email] of EMAIL_BY_PHONE) {
      const result = await prisma.customer.updateMany({
        where: {
          phone,
          email: { contains: PLACEHOLDER },
        },
        data: { email },
      })
      if (result.count > 0) {
        updated.push({ phone, email, count: result.count })
      } else {
        skipped.push({ phone, reason: 'no placeholder-email customer matched this phone' })
      }
    }

    const remaining = await prisma.customer.count({
      where: { email: { contains: PLACEHOLDER } },
    })

    return NextResponse.json({
      ok: true,
      updatedPhones: updated.length,
      updatedRows: updated.reduce((s, u) => s + u.count, 0),
      skipped,
      remainingPlaceholders: remaining,
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Backfill failed', detail: err?.message ?? String(err) },
      { status: 500 }
    )
  }
}
