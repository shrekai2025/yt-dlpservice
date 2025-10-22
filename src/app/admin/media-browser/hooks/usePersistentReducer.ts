import { useCallback, useEffect, useReducer, useState } from 'react'
import { saveToLocalStorage } from '../utils'

const REPLACE_ACTION = '__PERSIST_REPLACE__'

type LegacyLoader<S> = () => Partial<S> | undefined

type Options<S> = {
  storageKey: string
  legacyLoader?: LegacyLoader<S>
}

type ReplaceAction<S> = {
  type: typeof REPLACE_ACTION
  payload: S
}

/**
 * A small wrapper around useReducer that rehydrates from localStorage *after*
 * the initial render. This keeps SSR markup deterministic while still
 * restoring persisted state on the client.
 *
 * The hook also writes every subsequent state change back to storage.
 */
export function usePersistentReducer<S, A extends { type: string }>(
  reducer: (state: S, action: A) => S,
  initialState: S,
  options: Options<S>
) {
  const { storageKey, legacyLoader } = options

  const wrappedReducer = useCallback(
    (state: S, action: A | ReplaceAction<S>) => {
      if (
        typeof action === 'object' &&
        action !== null &&
        'type' in action &&
        (action as ReplaceAction<S>).type === REPLACE_ACTION
      ) {
        return (action as ReplaceAction<S>).payload
      }

      return reducer(state, action as A)
    },
    [reducer]
  )

  const [state, dispatchBase] = useReducer<
    (state: S, action: A | ReplaceAction<S>) => S
  >(wrappedReducer, initialState)

  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') {
      setHydrated(true)
      return
    }

    let nextState: S | undefined
    const storedRaw = window.localStorage.getItem(storageKey)

    if (storedRaw) {
      try {
        nextState = JSON.parse(storedRaw) as S
      } catch (error) {
        console.warn(`Failed to parse persisted state for ${storageKey}`, error)
      }
    }

    if (!nextState && legacyLoader) {
      const legacy = legacyLoader()
      if (legacy && Object.keys(legacy).length > 0) {
        nextState = { ...initialState, ...legacy }
      }
    }

    if (nextState) {
      dispatchBase({
        type: REPLACE_ACTION,
        payload: nextState,
      })
    }

    setHydrated(true)
  }, [initialState, legacyLoader, storageKey])

  useEffect(() => {
    if (!hydrated) return
    saveToLocalStorage(storageKey, state)
  }, [hydrated, state, storageKey])

  const dispatch = useCallback(
    (action: A) => {
      dispatchBase(action)
    },
    [dispatchBase]
  )

  return [state, dispatch, hydrated] as const
}
