import { supabase, type ConversationMessage, type PsychResponse } from '../lib/supabase';
import { v4 as uuidv4 } from 'uuid';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';

export interface ConversationState {
  sessionId: string;
  userId: string;
  messages: ConversationMessage[];
  extractedData: Record<string, any>;
  currentPhase: 'introduction' | 'basic_info' | 'deep_questions' | 'completion';
  isComplete: boolean;
}

export interface AIResponse {
  message: string;
  nextAction: 'continue' | 'extract_data' | 'complete';
  extractedData?: Record<string, any>;
  confidence: number;
}

class ConversationalAIService {
  private async callGeminiAPI(messages: ConversationMessage[], systemPrompt: string): Promise<string> {
    if (!GEMINI_API_KEY) {
      throw new Error('Gemini API key not configured');
    }

    // Format conversation for Gemini
    const conversationText = messages
      .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
      .join('\n');

    const fullPrompt = `${systemPrompt}\n\nConversation so far:\n${conversationText}\n\nRespond as the Assistant:`;

    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: fullPrompt
          }]
        }],
        generationConfig: {
          temperature: 0.8,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.candidates[0]?.content?.parts[0]?.text || '';
  }

  async startConversation(userId: string): Promise<ConversationState> {
    const sessionId = uuidv4();
    
    const systemPrompt = `You are a warm, empathetic AI psychologist conducting a personality assessment through natural conversation. Your goal is to gather deep psychological insights while making the user feel comfortable and understood.

CONVERSATION PHASES:
1. INTRODUCTION: Welcome warmly, explain the process, ask for their name
2. BASIC_INFO: Gather birth details (date, time, place) conversationally
3. DEEP_QUESTIONS: Ask 6-8 strategic psychological questions that reveal:
   - Core values and beliefs
   - Relationship patterns
   - How they handle challenges
   - Self-perception vs. reality
   - Hidden motivations and fears

QUESTION STRATEGY:
- Start with easier, more surface-level questions
- Gradually go deeper based on their responses
- Ask follow-up questions that explore contradictions
- Use their own words and examples in follow-ups
- Be genuinely curious, not interrogative

TONE GUIDELINES:
- Conversational and warm, never clinical
- Show genuine interest in their responses
- Acknowledge their vulnerability when they share deeply
- Use their name occasionally to personalize
- Validate their feelings and experiences

CURRENT PHASE: introduction
EXTRACTED DATA: {}

Begin with a warm welcome and ask for their name.`;

    const initialMessage = await this.callGeminiAPI([], systemPrompt);
    
    const assistantMessage: ConversationMessage = {
      id: uuidv4(),
      user_id: userId,
      session_id: sessionId,
      role: 'assistant',
      content: initialMessage,
      message_type: 'question',
      created_at: new Date().toISOString()
    };

    // Save to database
    await this.saveMessage(assistantMessage);

    return {
      sessionId,
      userId,
      messages: [assistantMessage],
      extractedData: {},
      currentPhase: 'introduction',
      isComplete: false
    };
  }

  async continueConversation(
    state: ConversationState, 
    userMessage: string, 
    responseTimeSeconds?: number
  ): Promise<{ state: ConversationState; aiResponse: AIResponse }> {
    
    // Create user message
    const userMsg: ConversationMessage = {
      id: uuidv4(),
      user_id: state.userId,
      session_id: state.sessionId,
      role: 'user',
      content: userMessage,
      message_type: 'answer',
      response_time_seconds: responseTimeSeconds,
      created_at: new Date().toISOString()
    };

    // Analyze user response
    const analysis = this.analyzeUserResponse(userMessage);
    userMsg.emotion_detected = analysis.emotion;
    userMsg.tone_analysis = analysis.tone;

    // Save user message
    await this.saveMessage(userMsg);

    // Update conversation state
    const updatedMessages = [...state.messages, userMsg];

    // Determine current phase and extracted data
    const { phase, extractedData } = this.updatePhaseAndExtractData(
      updatedMessages, 
      state.extractedData
    );

    // Generate system prompt based on current phase
    const systemPrompt = this.generateSystemPrompt(phase, extractedData, updatedMessages);

    // Get AI response
    const aiResponseText = await this.callGeminiAPI(updatedMessages, systemPrompt);

    // Create assistant message
    const assistantMsg: ConversationMessage = {
      id: uuidv4(),
      user_id: state.userId,
      session_id: state.sessionId,
      role: 'assistant',
      content: aiResponseText,
      message_type: phase === 'completion' ? 'summary' : 'question',
      created_at: new Date().toISOString()
    };

    // Save assistant message
    await this.saveMessage(assistantMsg);

    // Update state
    const newState: ConversationState = {
      ...state,
      messages: [...updatedMessages, assistantMsg],
      extractedData,
      currentPhase: phase,
      isComplete: phase === 'completion'
    };

    const aiResponse: AIResponse = {
      message: aiResponseText,
      nextAction: phase === 'completion' ? 'complete' : 'continue',
      extractedData,
      confidence: 0.85
    };

    return { state: newState, aiResponse };
  }

  private analyzeUserResponse(message: string) {
    const words = message.toLowerCase().split(' ');
    const wordCount = words.length;
    
    // Emotion detection
    const emotionKeywords = {
      joy: ['happy', 'excited', 'love', 'amazing', 'wonderful', 'great', 'fantastic'],
      sadness: ['sad', 'disappointed', 'hurt', 'lonely', 'depressed', 'down'],
      anger: ['angry', 'frustrated', 'annoyed', 'mad', 'furious', 'irritated'],
      fear: ['scared', 'worried', 'anxious', 'nervous', 'afraid', 'concerned'],
      surprise: ['surprised', 'shocked', 'unexpected', 'amazed', 'wow'],
      neutral: ['okay', 'fine', 'normal', 'usual', 'regular', 'alright']
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
    const confidence = Math.min(1, wordCount / 15);
    const energy = words.filter(word => 
      ['very', 'really', 'extremely', 'absolutely', '!', 'totally'].some(energetic => 
        word.includes(energetic)
      )
    ).length / wordCount;
    
    const verbosity = Math.min(1, wordCount / 30);
    const hesitation = words.filter(word => 
      ['maybe', 'perhaps', 'i think', 'probably', 'might', 'sort of'].some(hesitant => 
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
      }
    };
  }

  private updatePhaseAndExtractData(
    messages: ConversationMessage[], 
    currentData: Record<string, any>
  ): { phase: ConversationState['currentPhase']; extractedData: Record<string, any> } {
    
    const userMessages = messages.filter(msg => msg.role === 'user');
    const extractedData = { ...currentData };

    // Extract name from early messages
    if (!extractedData.name && userMessages.length >= 1) {
      const firstResponse = userMessages[0].content.toLowerCase();
      const nameMatch = firstResponse.match(/(?:i'm|i am|my name is|call me)\s+([a-zA-Z]+)/);
      if (nameMatch) {
        extractedData.name = nameMatch[1];
      } else if (firstResponse.split(' ').length <= 3) {
        // Assume short response is just their name
        extractedData.name = userMessages[0].content.trim();
      }
    }

    // Extract birth information
    userMessages.forEach(msg => {
      const content = msg.content.toLowerCase();
      
      // Birth date patterns
      const datePatterns = [
        /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/,
        /(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/,
        /(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2}),?\s+(\d{4})/i
      ];

      datePatterns.forEach(pattern => {
        const match = content.match(pattern);
        if (match && !extractedData.birthDate) {
          extractedData.birthDate = match[0];
        }
      });

      // Birth time patterns
      const timePattern = /(\d{1,2}):(\d{2})\s*(am|pm)?/i;
      const timeMatch = content.match(timePattern);
      if (timeMatch && !extractedData.birthTime) {
        extractedData.birthTime = timeMatch[0];
      }

      // Birth place patterns
      if (content.includes('born in') || content.includes('from')) {
        const placeMatch = content.match(/(?:born in|from)\s+([^.!?]+)/i);
        if (placeMatch && !extractedData.birthPlace) {
          extractedData.birthPlace = placeMatch[1].trim();
        }
      }
    });

    // Determine phase
    let phase: ConversationState['currentPhase'] = 'introduction';
    
    if (extractedData.name) {
      phase = 'basic_info';
    }
    
    if (extractedData.name && extractedData.birthDate) {
      phase = 'deep_questions';
    }
    
    if (userMessages.length >= 8) {
      phase = 'completion';
    }

    return { phase, extractedData };
  }

  private generateSystemPrompt(
    phase: ConversationState['currentPhase'],
    extractedData: Record<string, any>,
    messages: ConversationMessage[]
  ): string {
    const basePrompt = `You are a warm, empathetic AI psychologist conducting a personality assessment through natural conversation.`;
    
    const userResponses = messages
      .filter(msg => msg.role === 'user')
      .map(msg => msg.content)
      .join(' | ');

    switch (phase) {
      case 'introduction':
        return `${basePrompt}

CURRENT PHASE: Introduction
GOAL: Get their name and make them feel comfortable

Be warm and welcoming. Ask for their name if you haven't already.`;

      case 'basic_info':
        return `${basePrompt}

CURRENT PHASE: Basic Information Gathering
EXTRACTED DATA: ${JSON.stringify(extractedData)}
GOAL: Gather birth details (date, time, place) conversationally

You have their name: ${extractedData.name || 'Unknown'}
Now gather their birth information naturally. Ask about:
- Birth date (if not already known)
- Birth time (if not already known) 
- Birth place (if not already known)

Make it conversational, not like a form. Explain briefly why you need this for their astrological chart.`;

      case 'deep_questions':
        return `${basePrompt}

CURRENT PHASE: Deep Psychological Questions
EXTRACTED DATA: ${JSON.stringify(extractedData)}
USER RESPONSES SO FAR: ${userResponses}

GOAL: Ask strategic questions that reveal personality patterns

Ask ONE thoughtful question that explores:
- Core values and what drives them
- How they handle relationships and conflict
- Their self-perception vs. how others see them
- Hidden fears or motivations
- Past experiences that shaped them

Base your question on their previous responses. Look for contradictions or areas to explore deeper.
Be genuinely curious, not clinical.`;

      case 'completion':
        return `${basePrompt}

CURRENT PHASE: Completion
EXTRACTED DATA: ${JSON.stringify(extractedData)}
USER RESPONSES: ${userResponses}

GOAL: Provide a warm conclusion and transition to report generation

Thank them for their openness and vulnerability. Give them a brief, insightful reflection on what you've learned about them. Let them know their personalized cosmic blueprint is being generated.

Be appreciative and validating of what they've shared.`;

      default:
        return basePrompt;
    }
  }

  private async saveMessage(message: ConversationMessage): Promise<void> {
    const { error } = await supabase
      .from('conversation_messages')
      .insert(message);

    if (error) {
      console.error('Failed to save conversation message:', error);
      throw new Error(`Failed to save message: ${error.message}`);
    }
  }

  async getConversationHistory(sessionId: string): Promise<ConversationMessage[]> {
    const { data, error } = await supabase
      .from('conversation_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch conversation: ${error.message}`);
    }

    return data || [];
  }

  async saveExtractedData(userId: string, sessionId: string, extractedData: Record<string, any>): Promise<void> {
    // Convert conversation to psychology response format
    const psychResponse = {
      user_id: userId,
      session_id: sessionId,
      question_id: 0,
      question: 'Conversational Assessment',
      answer: JSON.stringify(extractedData),
      response_method: 'text' as const,
      extracted_data: extractedData,
      word_count: JSON.stringify(extractedData).length
    };

    const { error } = await supabase
      .from('psych_responses')
      .insert(psychResponse);

    if (error) {
      throw new Error(`Failed to save extracted data: ${error.message}`);
    }
  }
}

export const conversationalAI = new ConversationalAIService();