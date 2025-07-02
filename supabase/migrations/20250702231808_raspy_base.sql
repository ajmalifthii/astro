/*
  # Add Conversational AI Support

  1. New Tables
    - `conversation_messages` - Store chat messages between user and AI
    - Update existing tables with new fields for conversational support

  2. Security
    - Enable RLS on new tables
    - Add policies for authenticated users

  3. Enhancements
    - Add conversation tracking to existing tables
    - Support for real-time messaging
*/

-- Conversation messages table for chat interface
CREATE TABLE IF NOT EXISTS conversation_messages (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  session_id uuid NOT NULL,
  role text NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content text NOT NULL,
  message_type text DEFAULT 'question' CHECK (message_type IN ('question', 'answer', 'clarification', 'summary')),
  emotion_detected text,
  tone_analysis jsonb,
  response_time_seconds int,
  created_at timestamptz DEFAULT now()
);

-- Add conversation support to existing tables
DO $$
BEGIN
  -- Add conversation_id to psych_responses if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'psych_responses' AND column_name = 'conversation_id'
  ) THEN
    ALTER TABLE psych_responses ADD COLUMN conversation_id uuid;
  END IF;

  -- Add extracted_data to psych_responses if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'psych_responses' AND column_name = 'extracted_data'
  ) THEN
    ALTER TABLE psych_responses ADD COLUMN extracted_data jsonb;
  END IF;

  -- Add conversation_context to ai_analysis if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ai_analysis' AND column_name = 'conversation_context'
  ) THEN
    ALTER TABLE ai_analysis ADD COLUMN conversation_context jsonb;
  END IF;

  -- Add profile completion tracking to users if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'profile_completed'
  ) THEN
    ALTER TABLE users ADD COLUMN profile_completed boolean DEFAULT false;
  END IF;

  -- Add last_active to users if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'last_active'
  ) THEN
    ALTER TABLE users ADD COLUMN last_active timestamptz DEFAULT now();
  END IF;

  -- Add confidence_score to astrology_reports if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'astrology_reports' AND column_name = 'confidence_score'
  ) THEN
    ALTER TABLE astrology_reports ADD COLUMN confidence_score float CHECK (confidence_score >= 0 AND confidence_score <= 1);
  END IF;
END $$;

-- Enable RLS on conversation_messages
ALTER TABLE conversation_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for conversation_messages
CREATE POLICY "Users can read own conversation messages"
  ON conversation_messages
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own conversation messages"
  ON conversation_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_conversation_messages_session ON conversation_messages(session_id, created_at);
CREATE INDEX IF NOT EXISTS idx_conversation_messages_user_session ON conversation_messages(user_id, session_id);
CREATE INDEX IF NOT EXISTS idx_psych_responses_conversation ON psych_responses(conversation_id);
CREATE INDEX IF NOT EXISTS idx_users_profile_completed ON users(profile_completed);
CREATE INDEX IF NOT EXISTS idx_users_last_active ON users(last_active);

-- Update the updated_at trigger for users table
CREATE TRIGGER update_users_last_active 
  BEFORE UPDATE ON users 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Add some sample conversation starters (optional)
INSERT INTO question_templates (category, question, follow_up_questions, psychological_target, difficulty_level) VALUES
('introduction', 'Hi there! I''m excited to learn about you and create your personalized cosmic blueprint. What should I call you?', ARRAY['That''s a lovely name! Tell me a bit about yourself.'], 'rapport_building', 1),
('birth_info', 'To create your astrological chart, I''ll need to know when and where you were born. What''s your birth date?', ARRAY['And what time were you born?', 'Where were you born?'], 'birth_data_collection', 1),
('personality_intro', 'Now for the fun part - let''s explore who you really are. What''s something about yourself that you think makes you unique?', ARRAY['That''s fascinating! Can you give me an example?'], 'personality_exploration', 2)
ON CONFLICT (id) DO NOTHING;