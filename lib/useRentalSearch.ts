'use client'

import { useCallback, useEffect, useState } from 'react'
import { emptyRentalSearch, startRentalSearch, visibleRentalSearchState } from './nycRentalSearch'

/** Both header layouts share the same failure, cancellation and retry behavior. */
export function useRentalSearch(query: string, enabled = true) {
  const [state, setState] = useState(() => emptyRentalSearch())
  const [attempt, setAttempt] = useState(0)
  const normalizedQuery = query.trim()

  useEffect(() => {
    if (!enabled) {
      setState(emptyRentalSearch(normalizedQuery))
      return
    }
    return startRentalSearch(normalizedQuery, setState)
  }, [normalizedQuery, enabled, attempt])

  const retry = useCallback(() => {
    setState(emptyRentalSearch(normalizedQuery, normalizedQuery.length >= 2 ? 'loading' : 'idle'))
    setAttempt(value => value + 1)
  }, [normalizedQuery])

  return { ...visibleRentalSearchState(query, enabled, state), retry }
}
