import type { Block } from '@/components/public/NycCustomPageBlocks'

export type NycPageSnapshot = { title: string; blocks: Block[] }
export type NycPageEditHistory = {
  past: NycPageSnapshot[]
  future: NycPageSnapshot[]
  lastGroup: string | null
  lastEditAt: number
}

export const EMPTY_NYC_PAGE_HISTORY: NycPageEditHistory = {
  past: [], future: [], lastGroup: null, lastEditAt: 0,
}

function cloneSnapshot(value: NycPageSnapshot): NycPageSnapshot {
  return JSON.parse(JSON.stringify(value)) as NycPageSnapshot
}

export function recordNycPageEdit(
  history: NycPageEditHistory,
  current: NycPageSnapshot,
  next: NycPageSnapshot,
  group: string,
  timestamp = Date.now(),
): NycPageEditHistory {
  if (JSON.stringify(current) === JSON.stringify(next)) return history
  // One undo checkpoint per typing burst in a single field, with a 700 ms gap.
  const sameBurst = history.lastGroup === group && timestamp - history.lastEditAt < 700 &&
    timestamp >= history.lastEditAt && history.past.length > 0
  return {
    past: sameBurst ? history.past : [...history.past.slice(-39), cloneSnapshot(current)],
    future: [],
    lastGroup: group,
    lastEditAt: timestamp,
  }
}

export function undoNycPageEdit(history: NycPageEditHistory, current: NycPageSnapshot) {
  if (!history.past.length) return null
  const target = history.past[history.past.length - 1]
  return {
    snapshot: cloneSnapshot(target),
    history: {
      past: history.past.slice(0, -1),
      future: [...history.future.slice(-39), cloneSnapshot(current)],
      lastGroup: null,
      lastEditAt: 0,
    } satisfies NycPageEditHistory,
  }
}

export function redoNycPageEdit(history: NycPageEditHistory, current: NycPageSnapshot) {
  if (!history.future.length) return null
  const target = history.future[history.future.length - 1]
  return {
    snapshot: cloneSnapshot(target),
    history: {
      past: [...history.past.slice(-39), cloneSnapshot(current)],
      future: history.future.slice(0, -1),
      lastGroup: null,
      lastEditAt: 0,
    } satisfies NycPageEditHistory,
  }
}
