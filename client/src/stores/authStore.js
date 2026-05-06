import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      selectedGymId: null,

      setUser: (user) => set({ user, isAuthenticated: !!user }),
      setAccessToken: (token) => set({ accessToken: token }),
      setSelectedGymId: (id) => set({ selectedGymId: id }),
      
      login: (user, accessToken) => set({ 
        user, 
        accessToken, 
        isAuthenticated: true 
      }),
      
      logout: () => set({ 
        user: null, 
        accessToken: null, 
        isAuthenticated: false,
        selectedGymId: null
      }),
    }),
    {
      name: 'gymvision-auth', // localStorage key
      partialize: (state) => ({ 
        user: state.user, 
        isAuthenticated: state.isAuthenticated, 
        selectedGymId: state.selectedGymId,
        accessToken: state.accessToken 
      }),
    }
  )
);

export default useAuthStore;
