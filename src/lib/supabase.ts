import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables. The app will run in demo mode.');
}

// Validate URL format
if (supabaseUrl && (supabaseUrl === 'your_supabase_project_url' || !supabaseUrl.startsWith('https://'))) {
  console.error('Invalid Supabase URL. Please set VITE_SUPABASE_URL to your actual Supabase project URL.');
}

// Validate anon key format
if (supabaseAnonKey && (supabaseAnonKey === 'your_supabase_anon_key' || supabaseAnonKey.length < 100)) {
  console.error('Invalid Supabase anon key. Please set VITE_SUPABASE_ANON_KEY to your actual Supabase anon key.');
}

// Create Supabase client with error handling
export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Enhanced database types with better organization
export interface User {
  id: string;
  email?: string;
  full_name: string;
  created_at: string;
  updated_at: string;
  birth_date: string;
  birth_time?: string;
  birth_place: string;
  latitude: number;
  longitude: number;
  timezone?: string;
  gender?: string;
  consent_data_usage: boolean;
  consent_ai_analysis: boolean;
  profile_completed: boolean;
  last_active: string;
}

export interface AstrologyReport {
  id: string;
  user_id: string;
  chart_json: any;
  sun_sign?: string;
  moon_sign?: string;
  rising_sign?: string;
  dominant_elements?: any;
  planetary_positions?: any;
  house_positions?: any;
  aspects?: any;
  generated_at: string;
  age_years?: number;
  age_months?: number;
  birth_weekday?: string;
  generation_date: string;
  confidence_score?: number;
}

export interface ConversationMessage {
  id: string;
  user_id: string;
  session_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  message_type: 'question' | 'answer' | 'clarification' | 'summary';
  emotion_detected?: string;
  tone_analysis?: any;
  response_time_seconds?: number;
  created_at: string;
}

export interface PsychResponse {
  id: string;
  user_id: string;
  session_id: string;
  conversation_id?: string;
  question_id: number;
  question: string;
  answer: string;
  response_method: 'text' | 'voice';
  tone_analysis?: any;
  emotion_detected?: string;
  honesty_score?: number;
  confidence_level?: number;
  response_time_seconds?: number;
  word_count?: number;
  extracted_data?: any;
  created_at: string;
}

export interface AIAnalysis {
  id: string;
  user_id: string;
  analysis_type: string;
  input_data: any;
  ai_response: any;
  model_used: string;
  confidence_score?: number;
  processing_time_ms?: number;
  conversation_context?: any;
  created_at: string;
}

export interface FinalReport {
  id: string;
  user_id: string;
  report_title: string;
  archetype_name: string;
  archetype_description?: string;
  inspirational_line?: string;
  summary_short: string;
  summary_detailed: string;
  astrology_breakdown?: string;
  psychology_insights?: string;
  mind_vs_heart?: string;
  strengths?: string;
  challenges?: string;
  growth_areas?: string;
  affirmations?: string;
  pdf_url?: string;
  pdf_generated: boolean;
  shared_publicly: boolean;
  share_token: string;
  generated_at: string;
  updated_at: string;
}

export interface QuestionTemplate {
  id: number;
  category: string;
  question: string;
  follow_up_questions?: string[];
  psychological_target: string;
  difficulty_level: number;
  is_active: boolean;
  created_at: string;
}

// Enhanced error handling
export class SupabaseError extends Error {
  constructor(message: string, public code?: string, public details?: any) {
    super(message);
    this.name = 'SupabaseError';
  }
}

// Connection health check with better error handling
export async function checkSupabaseConnection(): Promise<boolean> {
  if (!supabase) {
    console.warn('Supabase client not initialized. Running in demo mode.');
    return false;
  }

  try {
    // Try to query a simple table to check connection
    const { data, error } = await supabase.from('users').select('count').limit(1);
    
    if (error) {
      if (error.code === '42P01') {
        console.error('Database tables not found. Please apply migrations in your Supabase project.');
        return false;
      }
      console.error('Supabase connection error:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Failed to connect to Supabase:', error);
    return false;
  }
}

// Helper function to check if we're in demo mode
export function isDemoMode(): boolean {
  return !supabase || !supabaseUrl || !supabaseAnonKey;
}