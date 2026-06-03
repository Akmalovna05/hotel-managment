import { memo } from 'react'
import { Search } from 'lucide-react'

/**
 * Stable, memoized search field — must not be recreated by parent remounts.
 * Parent keeps immediate `value` state; debounce only the API query key.
 */
const SearchInput = memo(function SearchInput({
  value,
  onChange,
  placeholder = 'Search...',
  className = '',
  id,
}) {
  return (
    <div className={`relative min-w-[200px] flex-1 ${className}`}>
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
        aria-hidden
      />
      <input
        id={id}
        type="search"
        role="searchbox"
        className="input-field pl-10"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete="off"
        spellCheck={false}
      />
    </div>
  )
})

export default SearchInput
