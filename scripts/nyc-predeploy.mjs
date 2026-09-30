// Railway pre-deploy entry point for Friendly Party Rental NYC.
//
// Railway runs the pre-deploy command without a shell, so a command written as
// "a && b && c" only runs "a" (the rest become arguments to "a"). This script runs
// every step in order and stops at the first failure; a failed step fails the new
// deploy and the running deployment stays live.
//
// Railway pre-deploy command:  node scripts/nyc-predeploy.mjs
import { spawnSync } from 'node:child_process'
import { pathToFileURL } from 'node:url'

const node = process.execPath
const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx'

export const PREDEPLOY_STEPS = [
  [node, ['scripts/verify-nyc-stripe-readiness.mjs']],
  [node, ['scripts/sync-nyc-catalog-from-syracuse.mjs', '--apply']],
  [node, ['scripts/apply-nyc-premium-prices.mjs', '--apply']],
  [node, ['scripts/sync-nyc-quantities-from-syracuse.mjs', '--apply']],
  [node, ['scripts/ensure-nyc-deposit-rule.mjs', '--apply']],
  [npx, ['prisma', 'migrate', 'deploy']],
]

function label(command, args) {
  return [command === node ? 'node' : command, ...args].join(' ')
}

export function runPredeploy(steps = PREDEPLOY_STEPS, run = spawnSync) {
  for (const [command, args] of steps) {
    console.log('[nyc-predeploy] ' + label(command, args))
    const result = run(command, args, { stdio: 'inherit', env: process.env })
    if (result.error || result.status !== 0) {
      const reason = result.error ? result.error.message : 'exit ' + (result.status ?? result.signal)
      console.error('[nyc-predeploy] failed: ' + label(command, args) + ' (' + reason + ')')
      return typeof result.status === 'number' && result.status !== 0 ? result.status : 1
    }
  }
  console.log('[nyc-predeploy] all ' + steps.length + ' steps completed')
  return 0
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = runPredeploy()
}
