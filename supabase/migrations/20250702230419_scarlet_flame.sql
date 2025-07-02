/*
  # AstroPsyche Database Schema

  1. New Tables
    - `users` - User profiles with birth data
    - `astrology_reports` - Generated astrological charts and data
    - `psych_responses` - Psychology questionnaire answers with metadata
    - `final_reports` - Complete personality reports and PDFs
    - `ai_analysis` - AI-generated insights and emotional analysis

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
    - Secure access to sensitive psychological data

  3. Features
    - JSON storage for complex astrological chart data
    - Emotional analysis metadata
    - PDF generation tracking
    - User consent and privacy controls
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table with birth data
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  email text UNIQUE,
  full_name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  birth_date date NOT NULL,
  birth_time time,
  birth_place text NOT NULL,
  latitude float NOT NULL,
  longitude float NOT NULL,
  timezone text,
  gender text,
  consent_data_usage boolean DEFAULT true,
  consent_ai_analysis boolean DEFAULT true
);

-- Astrology reports and chart data
CREATE TABLE IF NOT EXISTS astrology_reports (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  chart_json jsonb NOT NULL,
  sun_sign text,
  moon_sign text,
  rising_sign text,
  dominant_elements jsonb,
  planetary_positions jsonb,
  house_positions jsonb,
  aspects jsonb,
  generated_at timestamptz DEFAULT now(),
  age_years int,
  age_months int,
  birth_weekday text,
  generation_date date DEFAULT CURRENT_DATE
);

-- Psychology questionnaire responses
CREATE TABLE IF NOT EXISTS psych_responses (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  session_id uuid NOT NULL,
  question_id int NOT NULL,
  question text NOT NULL,
  answer text NOT NULL,
  response_method text DEFAULT 'text', -- 'text' or 'voice'
  tone_analysis jsonb,
  emotion_detected text,
  honesty_score float CHECK (honesty_score >= 0 AND honesty_score <= 1),
  confidence_level float CHECK (confidence_level >= 0 AND confidence_level <= 1),
  response_time_seconds int,
  word_count int,
  created_at timestamptz DEFAULT now()
);

-- AI analysis and insights
CREATE TABLE IF NOT EXISTS ai_analysis (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  analysis_type text NOT NULL, -- 'emotional_profile', 'personality_summary', 'archetype'
  input_data jsonb NOT NULL,
  ai_response jsonb NOT NULL,
  model_used text DEFAULT 'gemini-pro',
  confidence_score float CHECK (confidence_score >= 0 AND confidence_score <= 1),
  processing_time_ms int,
  created_at timestamptz DEFAULT now()
);

-- Final personality reports
CREATE TABLE IF NOT EXISTS final_reports (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  report_title text NOT NULL,
  archetype_name text NOT NULL,
  archetype_description text,
  inspirational_line text,
  summary_short text NOT NULL,
  summary_detailed text NOT NULL,
  astrology_breakdown text,
  psychology_insights text,
  mind_vs_heart text,
  strengths text,
  challenges text,
  growth_areas text,
  affirmations text,
  pdf_url text,
  pdf_generated boolean DEFAULT false,
  shared_publicly boolean DEFAULT false,
  share_token uuid DEFAULT uuid_generate_v4(),
  generated_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Question templates for dynamic psychology questionnaire
CREATE TABLE IF NOT EXISTS question_templates (
  id serial PRIMARY KEY,
  category text NOT NULL, -- 'values', 'relationships', 'challenges', 'growth'
  question text NOT NULL,
  follow_up_questions text[],
  psychological_target text, -- what this question aims to reveal
  difficulty_level int DEFAULT 1 CHECK (difficulty_level >= 1 AND difficulty_level <= 5),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE astrology_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE psych_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE final_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can read own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own data"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own data"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- RLS Policies for astrology_reports
CREATE POLICY "Users can read own astrology reports"
  ON astrology_reports
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own astrology reports"
  ON astrology_reports
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- RLS Policies for psych_responses
CREATE POLICY "Users can read own psych responses"
  ON psych_responses
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own psych responses"
  ON psych_responses
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- RLS Policies for ai_analysis
CREATE POLICY "Users can read own AI analysis"
  ON ai_analysis
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own AI analysis"
  ON ai_analysis
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- RLS Policies for final_reports
CREATE POLICY "Users can read own reports"
  ON final_reports
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own reports"
  ON final_reports
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own reports"
  ON final_reports
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- Public access to shared reports via share_token
CREATE POLICY "Public can read shared reports"
  ON final_reports
  FOR SELECT
  TO anon
  USING (shared_publicly = true);

-- RLS Policies for question_templates (read-only for authenticated users)
CREATE POLICY "Authenticated users can read question templates"
  ON question_templates
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Insert sample question templates
INSERT INTO question_templates (category, question, follow_up_questions, psychological_target, difficulty_level) VALUES
('values', 'What is something about you that only close friends truly understand?', ARRAY['How do you think this affects your relationships?', 'When did you first realize this about yourself?'], 'authentic_self_vs_public_persona', 2),
('challenges', 'Describe a moment when you let someone down. Why do you think it happened?', ARRAY['How did you handle the aftermath?', 'What would you do differently now?'], 'responsibility_and_guilt_patterns', 3),
('relationships', 'When do you feel the most misunderstood, and by whom?', ARRAY['How do you typically respond in these situations?', 'What do you wish they understood about you?'], 'communication_and_validation_needs', 2),
('growth', 'How do you act when you are truly proud of yourself - do you celebrate openly or reflect quietly?', ARRAY['What makes you feel most proud?', 'How has this changed over time?'], 'self_recognition_and_validation_style', 1),
('values', 'What is a belief you hold that you think most people would disagree with?', ARRAY['How strongly do you defend this belief?', 'Where do you think this belief came from?'], 'core_values_and_conviction_strength', 4),
('challenges', 'Tell me about a time you had to choose between what you wanted and what was expected of you.', ARRAY['How did you make the decision?', 'Do you regret your choice?'], 'autonomy_vs_conformity_tension', 3),
('relationships', 'How do you show love or care to others?', ARRAY['Is this how you prefer to receive love?', 'Have you always shown care this way?'], 'love_language_and_attachment_style', 1),
('growth', 'What is something you used to judge others for that you now understand better?', ARRAY['What changed your perspective?', 'How has this affected your relationships?'], 'empathy_development_and_shadow_work', 4);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_astrology_reports_user_id ON astrology_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_psych_responses_user_session ON psych_responses(user_id, session_id);
CREATE INDEX IF NOT EXISTS idx_ai_analysis_user_type ON ai_analysis(user_id, analysis_type);
CREATE INDEX IF NOT EXISTS idx_final_reports_user_id ON final_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_final_reports_share_token ON final_reports(share_token);
CREATE INDEX IF NOT EXISTS idx_question_templates_category ON question_templates(category, is_active);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_final_reports_updated_at BEFORE UPDATE ON final_reports FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();