import { useState, useCallback, useEffect } from 'react';
import { supabase, type User, checkSupabaseConnection } from '../lib/supabase';
import { generateAstrologyReport, type BirthData } from '../services/astrologyService';
import { generateFinalReport, generatePDF } from '../services/reportService';
import { useAppStore, handleAsyncError } from '../services/stateManager';
import { useAuth } from './useAuth';

export function useAstroPsyche() {
  const {
    user,
    isLoading,
    error,
    conversationData,
    currentReport,
    setUser,
    setLoading,
    setError,
    setConversationData,
    setCurrentReport
  } = useAppStore();

  const { user: authUser } = useAuth();
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');

  // Check Supabase connection on mount
  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    setConnectionStatus('checking');
    const isConnected = await checkSupabaseConnection();
    setConnectionStatus(isConnected ? 'connected' : 'disconnected');
    
    if (!isConnected) {
      setError('Unable to connect to database. Please ensure your Supabase project is properly configured and migrations are applied.');
    }
  };

  const createUser = useCallback(async (birthData: BirthData): Promise<User | null> => {
    if (!authUser) {
      setError('Please log in first');
      return null;
    }

    return handleAsyncError(async () => {
      const userId = authUser.id;

      // Create user profile with enhanced data
      const userData = {
        id: userId,
        full_name: birthData.name,
        birth_date: birthData.birthDate,
        birth_time: birthData.birthTime,
        birth_place: birthData.birthPlace,
        latitude: birthData.latitude,
        longitude: birthData.longitude,
        timezone: birthData.timezone || 'UTC',
        consent_data_usage: true,
        consent_ai_analysis: true,
        profile_completed: false,
        last_active: new Date().toISOString()
      };

      try {
        const { data: user, error: userError } = await supabase
          .from('users')
          .insert(userData)
          .select()
          .single();

        if (userError) {
          if (userError.code === '42P01') {
            throw new Error(
              'Database tables not found. Please apply the database migrations in your Supabase project dashboard under Database > Migrations.'
            );
          }
          throw new Error(`Failed to create user profile: ${userError.message}`);
        }

        // Generate astrology report
        await generateAstrologyReport(userId, birthData);

        setUser(user);
        return user;
      } catch (dbError) {
        console.warn('Database operation failed, using local storage:', dbError);
        
        // Fallback to localStorage if database operations fail
        const fallbackUser = {
          ...userData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        localStorage.setItem('astropsyche_user', JSON.stringify(fallbackUser));
        setUser(fallbackUser);
        return fallbackUser;
      }
    }, 'Failed to create user account');
  }, [setUser, authUser]);

  const updateUserProfile = useCallback(async (updates: Partial<User>): Promise<User | null> => {
    if (!user) {
      setError('No user logged in');
      return null;
    }

    return handleAsyncError(async () => {
      // Check if user is from localStorage (fallback mode)
      if (user.id.startsWith('temp-')) {
        const updatedUser = { ...user, ...updates, updated_at: new Date().toISOString() };
        localStorage.setItem('astropsyche_user', JSON.stringify(updatedUser));
        setUser(updatedUser);
        return updatedUser;
      }

      const { data: updatedUser, error } = await supabase
        .from('users')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
          last_active: new Date().toISOString()
        })
        .eq('id', user.id)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update profile: ${error.message}`);
      }

      setUser(updatedUser);
      return updatedUser;
    }, 'Failed to update user profile');
  }, [user, setUser]);

  const generateReport = useCallback(async (conversationData: Record<string, any>) => {
    if (!user) {
      setError('No user logged in');
      return null;
    }

    return handleAsyncError(async () => {
      // Create a session ID for the conversation data
      const sessionId = Date.now().toString();
      
      const report = await generateFinalReport(user.id, sessionId, conversationData);
      setCurrentReport(report);
      
      // Mark profile as completed
      await updateUserProfile({ profile_completed: true });
      
      return report;
    }, 'Failed to generate personality report');
  }, [user, setCurrentReport, updateUserProfile]);

  const downloadPDF = useCallback(async (reportId: string): Promise<string | null> => {
    return handleAsyncError(async () => {
      const pdfUrl = await generatePDF(reportId);
      return pdfUrl;
    }, 'Failed to generate PDF');
  }, []);

  const shareReport = useCallback(async (reportId: string, makePublic: boolean = true): Promise<string | null> => {
    return handleAsyncError(async () => {
      // Check if we're in fallback mode
      if (user?.id.startsWith('temp-')) {
        // Generate a mock share URL for demo
        const shareToken = 'demo-' + Date.now();
        const baseUrl = window.location.origin;
        return `${baseUrl}/shared/${shareToken}`;
      }

      const { data, error } = await supabase
        .from('final_reports')
        .update({ shared_publicly: makePublic })
        .eq('id', reportId)
        .select('share_token')
        .single();

      if (error) {
        throw new Error(`Failed to update sharing settings: ${error.message}`);
      }

      const baseUrl = window.location.origin;
      return `${baseUrl}/shared/${data.share_token}`;
    }, 'Failed to share report');
  }, [user]);

  const getUserReports = useCallback(async (): Promise<any[] | null> => {
    if (!user) return null;

    return handleAsyncError(async () => {
      // Check if we're in fallback mode
      if (user.id.startsWith('temp-')) {
        const storedReports = localStorage.getItem('astropsyche_reports');
        return storedReports ? JSON.parse(storedReports) : [];
      }

      const { data, error } = await supabase
        .from('final_reports')
        .select('*')
        .eq('user_id', user.id)
        .order('generated_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch reports: ${error.message}`);
      }

      return data || [];
    }, 'Failed to fetch user reports');
  }, [user]);

  // Auto-save conversation data
  const saveConversationData = useCallback((data: Record<string, any>) => {
    setConversationData(data);
    // Also save to localStorage as backup
    localStorage.setItem('astropsyche_conversation', JSON.stringify(data));
  }, [setConversationData]);

  // Load user from localStorage on mount if available and authenticated
  useEffect(() => {
    if (authUser && !user) {
      const storedUser = localStorage.getItem('astropsyche_user');
      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          // Only load if it matches the current auth user
          if (parsedUser.id === authUser.id) {
            setUser(parsedUser);
          }
        } catch (error) {
          console.error('Failed to parse stored user:', error);
          localStorage.removeItem('astropsyche_user');
        }
      }
    }
  }, [authUser, user, setUser]);

  return {
    // State
    user,
    isLoading,
    error,
    conversationData,
    currentReport,
    connectionStatus,
    
    // Actions
    createUser,
    updateUserProfile,
    generateReport,
    downloadPDF,
    shareReport,
    getUserReports,
    saveConversationData,
    checkConnection,
    
    // Utilities
    isAuthenticated: !!authUser,
    isConnected: connectionStatus === 'connected'
  };
}