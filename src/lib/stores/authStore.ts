import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { User } from "@/lib/types"

interface AuthState {
  user: User | null
  isLoading: boolean
  error: string | null
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  fetchUser: () => Promise<void>
}

// Mock user for demo purposes
const mockUser: User = {
  id: '1',
  name: 'John Doe',
  email: 'john.doe@example.com',
  role: 'manager',
  avatar: '/avatars/john-doe.jpg',
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isLoading: false,
      error: null,

      login: async (email, password) => {
        set({ isLoading: true, error: null })
        try {
          // Simulate API call
          await new Promise(resolve => setTimeout(resolve, 800))
          
          if (email === 'john.doe@example.com' && password === 'password') {
            set({ user: mockUser, isLoading: false })
          } else {
            set({ error: 'Invalid email or password', isLoading: false })
          }
        } catch (error) {
          set({ error: 'Failed to login', isLoading: false })
        }
      },

      logout: async () => {
        set({ isLoading: true, error: null })
        try {
          // Simulate API call
          await new Promise(resolve => setTimeout(resolve, 500))
          set({ user: null, isLoading: false })
        } catch (error) {
          set({ error: 'Failed to logout', isLoading: false })
        }
      },

      fetchUser: async () => {
        set({ isLoading: true, error: null })
        try {
          // Simulate API call
          await new Promise(resolve => setTimeout(resolve, 500))
          set({ user: mockUser, isLoading: false })
        } catch (error) {
          set({ error: 'Failed to fetch user', isLoading: false })
        }
      },
    }),
    {
      name: "auth-storage",
    },
  ),
)
