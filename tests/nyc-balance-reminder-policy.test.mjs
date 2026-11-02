import test from 'node:test'
import assert from 'node:assert/strict'
import { balanceReminderWindow, isBalanceReminderEligible } from '../lib/nycBalanceReminder.ts'

test('three calendar days use New York date around midnight and DST changes', () => {
  assert.equal(balanceReminderWindow(new Date('2026-11-02T03:30:00Z')).start.toISOString(), '2026-11-04T00:00:00.000Z')
  assert.equal(balanceReminderWindow(new Date('2027-03-13T15:00:00Z')).start.toISOString(), '2027-03-16T00:00:00.000Z')
  const {start, end} = balanceReminderWindow(new Date('2026-12-31T15:00:00Z'))
  assert.equal(start.toISOString(), '2027-01-03T00:00:00.000Z')
  assert.equal(end.toISOString(), '2027-01-04T00:00:00.000Z')
})

test('only eligible active unpaid orders receive reminders', () => {
  const order = { status: 'active', followUpsPaused: false, totalAmount: 100, amountPaid: 20, balanceReminderSentAt: null }
  assert.equal(isBalanceReminderEligible(order, true), true)
  for (const changes of [{ status: 'quote' }, {status: 'canceled'}, {followUpsPaused: true}, {amountPaid: 100}, {balanceReminderSentAt: new Date()}]) {
    assert.equal(isBalanceReminderEligible({...order, ...changes}, true), false)
  }
  assert.equal(isBalanceReminderEligible({...order, amountPaid: 0}, false), false)
  assert.equal(isBalanceReminderEligible(order, false), true)
})
