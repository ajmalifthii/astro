import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, FinalReport } from '../lib/supabase';

interface AppState {
  // User state
  user: User | null;
  isAuthenticated: boolean;
  
  // App flow state
  currentStep: number;
  formStep: number;
  
  // Loading states
  isLoading: boolean;
  loadingMessage: string;
  
  // Error handling
  error: string | null;
  
  // Conversation state
  conversationData: Record<string, any>;
  
  // Report state
  currentReport: FinalReport | null;
  
  // Actions
  setUser: (user: User | null) => void;
  setCurrentStep: (step: number) => void;
  setFormStep: (step: number) => void;
  setLoading: (loading: boolean, message?: string) => void;
  setError: (error: string | null) => void;
  setConversationData: (data: Record<string, any>) => void;
  setCurrentReport: (report: FinalReport | null) => void;
  reset: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      isAuthenticated: false,
      currentStep: 0,
      formStep: 0,
      isLoading: false,
      loadingMessage: '',
      error: null,
      conversationData: {},
      currentReport: null,

      // Actions
      setUser: (user) => set({ 
        user, 
        isAuthenticated: !!user 
      }),

      setCurrentStep: (step) => set({ 
        currentStep: step,
        formStep: 0 // Reset form step when changing main step
      }),

      setFormStep: (step) => set({ formStep: step }),

      setLoading: (loading, message = '') => set({ 
        isLoading: loading, 
        loadingMessage: message,
        error: loading ? null : get().error // Clear error when starting to load
      }),

      setError: (error) => set({ 
        error,
        isLoading: false // Stop loading when error occurs
      }),

      setConversationData: (data) => set({ conversationData: data }),

      setCurrentReport: (report) => set({ currentReport: report }),

      reset: () => set({
        user: null,
        isAuthenticated: false,
        currentStep: 0,
        formStep: 0,
        isLoading: false,
        loadingMessage: '',
        error: null,
        conversationData: {},
        currentReport: null
      })
    }),
    {
      name: 'astropsyche-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        currentStep: state.currentStep,
        conversationData: state.conversationData
      })
    }
  )
);

// Error handling utilities
export const handleAsyncError = async <T>(
  asyncFn: () => Promise<T>,
  errorMessage: string = 'An error occurred'
): Promise<T | null> => {
  const { setError, setLoading } = useAppStore.getState();
  
  try {
    setLoading(true);
    setError(null);
    const result = await asyncFn();
    setLoading(false);
    return result;
  } catch (error) {
    console.error(errorMessage, error);
    setError(error instanceof Error ? error.message : errorMessage);
    setLoading(false);
    return null;
  }
};

// Connection health monitoring
export const monitorConnection = () => {
  const { setError } = useAppStore.getState();
  
  const checkConnection = () => {
    if (!navigator.onLine) {
      setError('No internet connection. Please check your network.');
    } else {
      setError(null);
    }
  };

  window.addEventListener('online', checkConnection);
  window.addEventListener('offline', checkConnection);
  
  return () => {
    window.removeEventListener('online', checkConnection);
    window.removeEventListener('offline', checkConnection);
  };
};