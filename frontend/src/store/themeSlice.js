import { createSlice } from '@reduxjs/toolkit'

const getInitial = () => {
  const saved = localStorage.getItem('theme')
  if (saved) return saved
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

const themeSlice = createSlice({
  name: 'theme',
  initialState: { mode: getInitial() },
  reducers: {
    toggleTheme: (state) => {
      state.mode = state.mode === 'dark' ? 'light' : 'dark'
      localStorage.setItem('theme', state.mode)
      document.documentElement.classList.toggle('dark', state.mode === 'dark')
    },
    setTheme: (state, action) => {
      state.mode = action.payload
      localStorage.setItem('theme', state.mode)
      document.documentElement.classList.toggle('dark', state.mode === 'dark')
    },
  },
})

export const { toggleTheme, setTheme } = themeSlice.actions
export default themeSlice.reducer
