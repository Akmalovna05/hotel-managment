import { memo } from 'react'
import LoadingSpinner from './LoadingSpinner'

/**
 * Renders list content without unmounting sibling controls (search, filters).
 * Use isInitialLoad only when there is no data to show yet.
 */
const ListSection = memo(function ListSection({
  isInitialLoad,
  isFetching,
  children,
  empty,
}) {
  if (isInitialLoad) {
    return <LoadingSpinner />
  }

  return (
    <div
      className={`transition-opacity duration-150 ${isFetching ? 'pointer-events-none opacity-60' : 'opacity-100'}`}
      aria-busy={isFetching}
    >
      {empty ?? children}
    </div>
  )
})

export default ListSection
