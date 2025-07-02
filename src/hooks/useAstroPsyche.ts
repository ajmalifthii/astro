import { useState, useCallback, useEffect } from 'react';
import { supabase, type User, checkSupabaseConnection } from '../lib/supabase';
import { generateAstrologyReport, type BirthData } from '../services/astrologyService';
import { generateFinalReport, generatePDF } from '../services/reportService';
import { useAppStore, handleAsyncError } from '../services/stateManager';

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
      setError('Unable to connect to database. Please check your Supabase configuration.');
    }
  };

  const createUser = useCallback(async (birthData: BirthData): Promise<User | null> => {
    return handleAsyncError(async () => {
      // Create anonymous user account
      const { data: authData, error: authError } = await supabase.auth.signInAnonymously();
      
      if (authError) {
        throw new Error(`Authentication failed: ${authError.message}`);
      }

      const userId = authData.user.id;

      // Create user profile with enhanced data
      const userData = {
        id: userId,
        full_name: birthData.name,
        birth_date: birthData.birthDate,
        birth_time: birthData.birthTime,
        birth_place: birthData.birthPlace,
        latitude: birthData.latitude,
        longitude: birthData.longitude,
        timezone: birthData.timezone,
        consent_data_usage: true,
        consent_ai_analysis: true,
        profile_completed: false,
        last_active: new Date().toISOString()
      };

      const { data: user, error: userError } = await supabase
        .from('users')
        .insert(userData)
        .select()
        .single();

      if (userError) {
        throw new Error(`Failed to create user profile: ${userError.message}`);
      }

      // Generate astrology report
      await generateAstrologyReport(userId, birthData);

      setUser(user);
      return user;
    }, 'Failed to create user account');
  }, [setUser]);

  const updateUserProfile = useCallback(async (updates: Partial<User>): Promise<User | null> => {
    if (!user) {
      setError('No user logged in');
      return null;
    }

    return handleAsyncError(async () => {
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
  }, []);

  const getUserReports = useCallback(async (): Promise<any[] | null> => {
    if (!user) return null;

    return handleAsyncError(async () => {
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

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    useAppStore.getState().reset();
  }, []);

  // Auto-save conversation data
  const saveConversationData = useCallback((data: Record<string, any>) => {
    setConversationData(data);
  }, [setConversationData]);

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
    signOut,
    saveConversationData,
    checkConnection,
    
    // Utilities
    isAuthenticated: !!user,
    isConnected: connectionStatus === 'connected'
  };
}