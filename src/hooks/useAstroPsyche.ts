import { useState, useCallback } from 'react';
import { supabase, type User } from '../lib/supabase';
import { generateAstrologyReport, type BirthData } from '../services/astrologyService';
import { PsychologySession } from '../services/psychologyService';
import { generateFinalReport, generatePDF } from '../services/reportService';

export interface AstroPsycheState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  currentSession: PsychologySession | null;
}

export function useAstroPsyche() {
  const [state, setState] = useState<AstroPsycheState>({
    user: null,
    isLoading: false,
    error: null,
    currentSession: null
  });

  const setLoading = useCallback((loading: boolean) => {
    setState(prev => ({ ...prev, isLoading: loading }));
  }, []);

  const setError = useCallback((error: string | null) => {
    setState(prev => ({ ...prev, error }));
  }, []);

  const createUser = useCallback(async (birthData: BirthData): Promise<User> => {
    setLoading(true);
    setError(null);

    try {
      // Create user account (anonymous for now)
      const { data: authData, error: authError } = await supabase.auth.signInAnonymously();
      
      if (authError) {
        throw new Error(`Authentication failed: ${authError.message}`);
      }

      const userId = authData.user.id;

      // Create user profile
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
        consent_ai_analysis: true
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

      setState(prev => ({ ...prev, user }));
      return user;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setError(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [setLoading, setError]);

  const startPsychologySession = useCallback(async (userId: string): Promise<PsychologySession> => {
    setLoading(true);
    setError(null);

    try {
      const session = new PsychologySession(userId);
      await session.initializeSession();
      
      setState(prev => ({ ...prev, currentSession: session }));
      return session;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to start psychology session';
      setError(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [setLoading, setError]);

  const submitPsychAnswer = useCallback(async (answer: any): Promise<void> => {
    if (!state.currentSession) {
      throw new Error('No active psychology session');
    }

    setLoading(true);
    setError(null);

    try {
      await state.currentSession.submitAnswer(answer);
      // Force re-render by updating state
      setState(prev => ({ ...prev, currentSession: prev.currentSession }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to submit answer';
      setError(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [state.currentSession, setLoading, setError]);

  const generateReport = useCallback(async (userId: string, sessionId: string) => {
    setLoading(true);
    setError(null);

    try {
      const report = await generateFinalReport(userId, sessionId);
      return report;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate report';
      setError(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [setLoading, setError]);

  const downloadPDF = useCallback(async (reportId: string): Promise<string> => {
    setLoading(true);
    setError(null);

    try {
      const pdfUrl = await generatePDF(reportId);
      return pdfUrl;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate PDF';
      setError(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [setLoading, setError]);

  return {
    ...state,
    createUser,
    startPsychologySession,
    submitPsychAnswer,
    generateReport,
    downloadPDF
  };
}