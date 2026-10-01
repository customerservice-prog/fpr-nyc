const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
;(async()=>{
  const [connection,integration]=await Promise.all([
    prisma.googleCalendarConnection.findUnique({where:{id:'primary'},select:{scope:true}}),
    prisma.integrationConnection.findUnique({where:{provider:'google'},select:{apiKey:true,apiSecret:true}})
  ])
  console.log('[google-scope-check]',JSON.stringify({
    connectionExists:!!connection,
    scope:connection?.scope||null,
    oauthClientConfigured:Boolean((integration?.apiKey||'').trim()&&(integration?.apiSecret||'').trim())
  }))
})().catch(err=>{console.error('[google-scope-check] failed',err instanceof Error?err.message:String(err));process.exitCode=1}).finally(()=>prisma.$disconnect())
