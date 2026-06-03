/** Extract a user-friendly message from Axios/DRF errors. */
export function getApiErrorMessage(error, fallback = 'Something went wrong') {
  const data = error?.response?.data
  if (!data) return error?.message || fallback
  if (typeof data === 'string') return data
  if (data.detail) return String(data.detail)
  if (Array.isArray(data)) return data.join(' ')
  const parts = Object.entries(data).flatMap(([k, v]) => {
    const label = k === 'non_field_errors' ? '' : `${k}: `
    return Array.isArray(v) ? v.map((x) => `${label}${x}`) : [`${label}${v}`]
  })
  return parts.join(' ') || fallback
}
