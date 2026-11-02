import test from 'node:test'
import assert from 'node:assert/strict'
import { REMINDER_HOTFIX_STEPS, runPredeploy } from '../scripts/nyc-predeploy.mjs'

test('the reminder hotfix keeps required checks without changing catalog or prices', () => {
  const commands = REMINDER_HOTFIX_STEPS.map(([,args])=>args.join(' '))
  assert.deepEqual(commands, ['scripts/verify-nyc-stripe-readiness.mjs', 'prisma migrate deploy'])
  const observed = []
  assert.equal(runPredeploy(REMINDER_HOTFIX_STEPS, (command,args)=>{ observed.push(args.join(' ')); return {status:0} }), 0)
  assert.deepEqual(observed,commands)
  assert.equal(runPredeploy(REMINDER_HOTFIX_STEPS, ()=>({status:1})),1)
})
