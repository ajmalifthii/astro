import { supabase, type PsychResponse, type QuestionTemplate } from '../lib/supabase';
import { v4 as uuidv4 } from 'uuid';

export interface PsychQuestion {
  id: number;
  question: string;
  category: string;
  followUpQuestions?: string[];
  psychologicalTarget: string;
  difficultyLevel: number;
}

export interface PsychAnswer {
  questionId: number;
  question: string;
  answer: string;
  responseMethod: 'text' | 'voice';
  responseTimeSeconds?: number;
  emotionDetected?: string;
  toneAnalysis?: {
    confidence: number;
    energy: number;
    verbosity: number;
    hesitation: number;
    authenticity: number;
  };
}

export class PsychologySession {
  private sessionId: string;
  private userId: string;
  private questions: PsychQuestion[] = [];
  private responses: PsychAnswer[] = [];
  private currentQuestionIndex = 0;

  constructor(userId: string) {
    this.sessionId = uuidv4();
    this.userId = userId;
  }

  async initializeSession(): Promise<void> {
    // Fetch question templates from database
    const { data: templates, error } = await supabase
      .from('question_templates')
      .select('*')
      .eq('is_active', true)
      .order('difficulty_level', { ascending: true });

    if (error) {
      throw new Error(`Failed to load questions: ${error.message}`);
    }

    // Convert templates to questions and shuffle for variety
    this.questions = this.shuffleArray(templates.map(template => ({
      id: template.id,
      question: template.question,
      category: template.category,
      followUpQuestions: template.follow_up_questions,
      psychologicalTarget: template.psychological_target,
      difficultyLevel: template.difficulty_level
    })));
  }

  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  getCurrentQuestion(): PsychQuestion | null {
    if (this.currentQuestionIndex >= this.questions.length) {
      return null;
    }
    return this.questions[this.currentQuestionIndex];
  }

  async submitAnswer(answer: PsychAnswer): Promise<void> {
    // Analyze the response
    const analysis = this.analyzeResponse(answer.answer, answer.responseMethod);
    
    // Enhanced answer with analysis
    const enhancedAnswer: PsychAnswer = {
      ...answer,
      emotionDetected: analysis.emotion,
      toneAnalysis: analysis.tone
    };

    this.responses.push(enhancedAnswer);

    // Save to database
    const responseData = {
      user_id: this.userId,
      session_id: this.sessionId,
      question_id: answer.questionId,
      question: answer.question,
      answer: answer.answer,
      response_method: answer.responseMethod,
      tone_analysis: analysis.tone,
      emotion_detected: analysis.emotion,
      honesty_score: analysis.honestyScore,
      confidence_level: analysis.confidenceLevel,
      response_time_seconds: answer.responseTimeSeconds,
      word_count: answer.answer.split(' ').length
    };

    const { error } = await supabase
      .from('psych_responses')
      .insert(responseData);

    if (error) {
      throw new Error(`Failed to save response: ${error.message}`);
    }

    this.currentQuestionIndex++;
  }

  private analyzeResponse(answer: string, method: 'text' | 'voice') {
    // Simple text analysis - in production, use AI/ML services
    const words = answer.toLowerCase().split(' ');
    const wordCount = words.length;
    
    // Emotion detection based on keywords
    const emotionKeywords = {
      joy: ['happy', 'excited', 'love', 'amazing', 'wonderful', 'great'],
      sadness: ['sad', 'disappointed', 'hurt', 'lonely', 'depressed'],
      anger: ['angry', 'frustrated', 'annoyed', 'mad', 'furious'],
      fear: ['scared', 'worried', 'anxious', 'nervous', 'afraid'],
      surprise: ['surprised', 'shocked', 'unexpected', 'amazed'],
      neutral: ['okay', 'fine', 'normal', 'usual', 'regular']
    };

    let detectedEmotion = 'neutral';
    let maxMatches = 0;

    for (const [emotion, keywords] of Object.entries(emotionKeywords)) {
      const matches = keywords.filter(keyword => 
        words.some(word => word.includes(keyword))
      ).length;
      
      if (matches > maxMatches) {
        maxMatches = matches;
        detectedEmotion = emotion;
      }
    }

    // Tone analysis
    const confidence = Math.min(1, wordCount / 20); // More words = more confidence
    const energy = words.filter(word => 
      ['very', 'really', 'extremely', 'absolutely', '!'].some(energetic => 
        word.includes(energetic)
      )
    ).length / wordCount;
    
    const verbosity = Math.min(1, wordCount / 50);
    const hesitation = words.filter(word => 
      ['maybe', 'perhaps', 'i think', 'probably', 'might'].some(hesitant => 
        word.includes(hesitant)
      )
    ).length / wordCount;

    const authenticity = 1 - (hesitation * 0.3) + (confidence * 0.2);

    return {
      emotion: detectedEmotion,
      tone: {
        confidence: Math.round(confidence * 100) / 100,
        energy: Math.round(energy * 100) / 100,
        verbosity: Math.round(verbosity * 100) / 100,
        hesitation: Math.round(hesitation * 100) / 100,
        authenticity: Math.round(Math.max(0, Math.min(1, authenticity)) * 100) / 100
      },
      honestyScore: Math.round(Math.max(0.3, authenticity) * 100) / 100,
      confidenceLevel: Math.round(confidence * 100) / 100
    };
  }

  getResponses(): PsychAnswer[] {
    return [...this.responses];
  }

  getSessionId(): string {
    return this.sessionId;
  }

  isComplete(): boolean {
    return this.responses.length >= Math.min(8, this.questions.length);
  }

  getProgress(): number {
    return Math.round((this.responses.length / Math.min(8, this.questions.length)) * 100);
  }
}

export async function getUserPsychResponses(userId: string, sessionId?: string): Promise<PsychResponse[]> {
  let query = supabase
    .from('psych_responses')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (sessionId) {
    query = query.eq('session_id', sessionId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch psychology responses: ${error.message}`);
  }

  return data || [];
}