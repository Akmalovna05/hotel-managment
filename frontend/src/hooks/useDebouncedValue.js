import { useEffect, useState } from 'react'

/**
 * Returns a debounced copy of `value` for API/query keys.
 * Local input state should update immediately; use this for network requests.
 */
export function useDebouncedValue(value, delay = 300) {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debounced
}
