// Coalesce complete draft snapshots and serialize writes. Publish awaits flush().
export function createDraftSaveQueue<T>(write: (value: T) => Promise<void>) {
  let pending: { value: T } | null = null
  let running: Promise<void> | null = null
  return {
    enqueue(value: T) { pending = { value } },
    async flush(): Promise<void> {
      if (running) { await running; return this.flush() }
      if (!pending) return
      const drain = async () => {
        while (pending) {
          const next = pending
          pending = null
          try { await write(next.value) }
          catch (error) { if (!pending) pending = next; throw error }
        }
      }
      running = drain()
      try { await running } finally { running = null }
    },
  }
}
