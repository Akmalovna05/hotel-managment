import { createSlice } from '@reduxjs/toolkit'

const loadUser = () => {
  try {
    const u = localStorage.getItem('user')
    return u ? JSON.parse(u) : null
  } catch {
    return null
  }
}

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: loadUser(),
    isAuthenticated: !!localStorage.getItem('access_token'),
  },
  reducers: {
    setCredentials: (state, action) => {
      const { user, access, refresh } = action.payload
      state.user = user
      state.isAuthenticated = true
      localStorage.setItem('access_token', access)
      localStorage.setItem('refresh_token', refresh)
      localStorage.setItem('user', JSON.stringify(user))
    },
    updateUser: (state, action) => {
      state.user = { ...state.user, ...action.payload }
      localStorage.setItem('user', JSON.stringify(state.user))
    },
    logout: (state) => {
      state.user = null
      state.isAuthenticated = false
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      localStorage.removeItem('user')
    },
  },
})

export const { setCredentials, updateUser, logout } = authSlice.actions
export default authSlice.reducer
