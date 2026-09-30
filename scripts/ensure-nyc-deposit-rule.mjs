import { PrismaClient } from '@prisma/client'
const prisma=new PrismaClient()
const APPLY=process.argv.includes('--apply')
const approved={type:'percentage',amount:25}
const current=await prisma.depositRule.findFirst({where:{isActive:true},orderBy:{createdAt:'desc'}})
console.log(JSON.stringify({apply:APPLY,current:current?{type:current.type,amount:Number(current.amount),isActive:current.isActive}:null,approved},null,2))
if(!APPLY){await prisma.$disconnect();process.exit(0)}
if(current){
  await prisma.depositRule.update({where:{id:current.id},data:{type:approved.type,amount:approved.amount,isActive:true}})
}else{
  await prisma.depositRule.create({data:{type:approved.type,amount:approved.amount,isActive:true}})
}
console.log('NYC active deposit rule set to 25% first payment.')
await prisma.$disconnect()
