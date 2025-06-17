import { create } from 'zustand';
import { User } from '../lib/types';

type AuthState = {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => void;
  signUp: (name: string, email: string, password: string) => Promise<User>;
  resetPassword: (email: string) => Promise<void>;
};

// For demo purposes - would connect to a real API in production
const mockUsers: User[] = [
  {
    id: '1',
    name: 'Admin User',
    email: 'admin@example.com',
    role: 'admin',
    avatar: 'https://images.pexels.com/photos/2381069/pexels-photo-2381069.jpeg?auto=compress&cs=tinysrgb&w=150',
  },
  {
    id: '2',
    name: 'Manager User',
    email: 'manager@example.com',
    role: 'manager',
    avatar: 'https://images.pexels.com/photos/3763188/pexels-photo-3763188.jpeg?auto=compress&cs=tinysrgb&w=150',
  },
  {
    id: '3',
    name: 'Employee User',
    email: 'employee@example.com',
    role: 'employee',
    avatar: 'https://images.pexels.com/photos/3771807/pexels-photo-3771807.jpeg?auto=compress&cs=tinysrgb&w=150',
  },
  {
    id: '4',
    name: 'Support User',
    email: 'support@example.com',
    role: 'support',
    avatar: 'https://images.pexels.com/photos/1181534/pexels-photo-1181534.jpeg?auto=compress&cs=tinysrgb&w=150',
  },
];

// Mock password for demo accounts
const DEMO_PASSWORD = 'password123';

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  
  login: async (email, password) => {
    set({ isLoading: true });
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const user = mockUsers.find(u => u.email === email);
    
    if (!user || password !== DEMO_PASSWORD) {
      set({ isLoading: false });
      throw new Error('Invalid email or password');
    }
    
    set({ user, isAuthenticated: true, isLoading: false });
    return user;
  },
  
  logout: () => {
    set({ user: null, isAuthenticated: false });
  },
  
  signUp: async (name, email, password) => {
    set({ isLoading: true });
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Check if user already exists
    if (mockUsers.some(u => u.email === email)) {
      set({ isLoading: false });
      throw new Error('User already exists');
    }
    
    const newUser: User = {
      id: (mockUsers.length + 1).toString(),
      name,
      email,
      role: 'employee',
    };
    
    mockUsers.push(newUser);
    
    set({ user: newUser, isAuthenticated: true, isLoading: false });
    return newUser;
  },
  
  resetPassword: async (email) => {
    set({ isLoading: true });
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const user = mockUsers.find(u => u.email === email);
    
    if (!user) {
      set({ isLoading: false });
      throw new Error('User not found');
    }
    
    set({ isLoading: false });
    // In a real app, this would send an email with reset instructions
  },
}));