import test from 'node:test'
import assert from 'node:assert/strict'
import { REMINDER_HOTFIX_STEPS, runPredeploy } from '../scripts/nyc-predeploy.mjs'

test('deployment syncs the catalog using NYC rules without resetting deposit settings', () => {
  const commands = REMINDER_HOTFIX_STEPS.map(([,args])=>args.join(' '))
  assert.deepEqual(commands, ['scripts/verify-nyc-stripe-readiness.mjs', 'scripts/sync-nyc-catalog-from-syracuse.mjs --apply', 'prisma migrate deploy'])
  const observed = []
  assert.equal(runPredeploy(REMINDER_HOTFIX_STEPS, (command,args)=>{ observed.push(args.join(' ')); return {status:0} }), 0)
  assert.deepEqual(observed,commands)
  assert.equal(runPredeploy(REMINDER_HOTFIX_STEPS, ()=>({status:1})),1)
})
