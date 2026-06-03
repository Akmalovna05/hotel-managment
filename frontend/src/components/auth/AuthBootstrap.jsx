import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { authApi } from '../../api/client'
import { logout, updateUser } from '../../store/authSlice'

/** Sync auth state on load: validate token and refresh user profile. */
export default function AuthBootstrap() {
  const dispatch = useDispatch()
  const isAuthenticated = useSelector((s) => s.auth.isAuthenticated)

  useEffect(() => {
    if (!isAuthenticated) return
    let cancelled = false
    authApi
      .profile()
      .then(({ data }) => {
        if (!cancelled) dispatch(updateUser(data))
      })
      .catch(() => {
        if (!cancelled) dispatch(logout())
      })
    return () => {
      cancelled = true
    }
  }, [dispatch, isAuthenticated])

  return null
}
