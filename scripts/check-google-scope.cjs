const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
;(async()=>{
  const row=await prisma.googleCalendarConnection.findUnique({where:{id:'primary'},select:{scope:true}})
  console.log('[google-scope-check]',JSON.stringify({exists:!!row,scope:row?.scope||null}))
})().catch(err=>{console.error('[google-scope-check] failed',err instanceof Error?err.message:String(err));process.exitCode=1}).finally(()=>prisma.$disconnect())
