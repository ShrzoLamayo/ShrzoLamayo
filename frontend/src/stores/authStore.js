import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import api from '../services/api'
import toast from 'react-hot-toast'

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: false,
      isInitialized: false,

      // Initialize auth state from localStorage
      initializeAuth: () => {
        const token = localStorage.getItem('token')
        const user = localStorage.getItem('user')
        
        if (token && user) {
          try {
            const parsedUser = JSON.parse(user)
            set({ 
              token, 
              user: parsedUser, 
              isInitialized: true 
            })
            // Set API token
            api.defaults.headers.common['Authorization'] = `Bearer ${token}`
          } catch (error) {
            console.error('Error parsing user data:', error)
            get().logout()
          }
        } else {
          set({ isInitialized: true })
        }
      },

      // Login function
      login: async (email, password) => {
        set({ isLoading: true })
        try {
          const response = await api.post('/auth/login', { email, password })
          const { token, data } = response.data
          const user = data.user

          // Store in localStorage
          localStorage.setItem('token', token)
          localStorage.setItem('user', JSON.stringify(user))

          // Set API token
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`

          set({ 
            user, 
            token, 
            isLoading: false 
          })

          toast.success(`Welcome back, ${user.first_name}!`)
          return { success: true }
        } catch (error) {
          set({ isLoading: false })
          const message = error.response?.data?.message || 'Login failed'
          toast.error(message)
          return { success: false, error: message }
        }
      },

      // Register function
      register: async (userData) => {
        set({ isLoading: true })
        try {
          const response = await api.post('/auth/register', userData)
          const { token, data } = response.data
          const user = data.user

          // Store in localStorage
          localStorage.setItem('token', token)
          localStorage.setItem('user', JSON.stringify(user))

          // Set API token
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`

          set({ 
            user, 
            token, 
            isLoading: false 
          })

          toast.success(`Welcome, ${user.first_name}!`)
          return { success: true }
        } catch (error) {
          set({ isLoading: false })
          const message = error.response?.data?.message || 'Registration failed'
          toast.error(message)
          return { success: false, error: message }
        }
      },

      // Logout function
      logout: () => {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        delete api.defaults.headers.common['Authorization']
        
        set({ 
          user: null, 
          token: null, 
          isLoading: false 
        })
        
        toast.success('Logged out successfully')
      },

      // Update user profile
      updateProfile: async (userData) => {
        try {
          const response = await api.put('/auth/profile', userData)
          const updatedUser = response.data.data.user
          
          localStorage.setItem('user', JSON.stringify(updatedUser))
          set({ user: updatedUser })
          
          toast.success('Profile updated successfully')
          return { success: true }
        } catch (error) {
          const message = error.response?.data?.message || 'Profile update failed'
          toast.error(message)
          return { success: false, error: message }
        }
      },

      // Check if user is admin
      isAdmin: () => {
        const { user } = get()
        return user?.role === 'admin'
      },

      // Get user initials for avatar
      getUserInitials: () => {
        const { user } = get()
        if (!user) return 'U'
        return `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase()
      }
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ 
        user: state.user, 
        token: state.token 
      }),
    }
  )
)