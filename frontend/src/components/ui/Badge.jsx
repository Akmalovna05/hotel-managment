import { getStatusColor } from '../../utils/helpers'

export default function Badge({ status, label }) {
  return (
    <span className={`badge capitalize ${getStatusColor(status)}`}>
      {(label || status || '').replace(/_/g, ' ')}
    </span>
  )
}
