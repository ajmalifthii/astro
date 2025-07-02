import { supabase, type AIAnalysis, type AstrologyReport, type PsychResponse } from '../lib/supabase';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';

export interface PersonalityArchetype {
  name: string;
  description: string;
  inspirationalLine: string;
  coreTraits: string[];
  strengths: string[];
  challenges: string[];
  growthAreas: string[];
}

export interface PersonalityAnalysis {
  archetype: PersonalityArchetype;
  summaryShort: string;
  summaryDetailed: string;
  astrologyBreakdown: string;
  psychologyInsights: string;
  mindVsHeart: string;
  affirmations: string;
  confidenceScore: number;
}

class AIService {
  private async callGeminiAPI(prompt: string): Promise<string> {
    if (!GEMINI_API_KEY) {
      throw new Error('Gemini API key not configured');
    }

    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048,
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.candidates[0]?.content?.parts[0]?.text || '';
  }

  async generatePersonalityAnalysis(
    userId: string,
    astrologyReport: AstrologyReport,
    psychResponses: PsychResponse[]
  ): Promise<PersonalityAnalysis> {
    const startTime = Date.now();

    // Prepare comprehensive prompt
    const prompt = this.buildAnalysisPrompt(astrologyReport, psychResponses);
    
    try {
      const aiResponse = await this.callGeminiAPI(prompt);
      const analysis = this.parseAIResponse(aiResponse);
      
      const processingTime = Date.now() - startTime;

      // Save AI analysis to database
      await this.saveAIAnalysis(userId, 'personality_analysis', {
        astrology_report: astrologyReport,
        psych_responses: psychResponses
      }, analysis, processingTime);

      return analysis;
    } catch (error) {
      console.error('AI Analysis failed:', error);
      // Return fallback analysis
      return this.generateFallbackAnalysis(astrologyReport, psychResponses);
    }
  }

  private buildAnalysisPrompt(astrologyReport: AstrologyReport, psychResponses: PsychResponse[]): string {
    const chart = astrologyReport.chart_json;
    
    return `You are an expert astro-psychologist with deep knowledge of both astrology and human psychology. 

BIRTH DATA:
- Sun Sign: ${chart.sun.sign} (${chart.sun.degree}°, House ${chart.sun.house})
- Moon Sign: ${chart.moon.sign} (${chart.moon.degree}°, House ${chart.moon.house})
- Rising Sign: ${chart.rising.sign} (${chart.rising.degree}°)
- Age: ${astrologyReport.age_years} years, ${astrologyReport.age_months} months
- Born on: ${astrologyReport.birth_weekday}

PLANETARY POSITIONS:
${chart.planets.map(p => `- ${p.name}: ${p.sign} (House ${p.house})${p.retrograde ? ' Retrograde' : ''}`).join('\n')}

PSYCHOLOGICAL RESPONSES:
${psychResponses.map((r, i) => `
Question ${i + 1}: ${r.question}
Answer: ${r.answer}
Emotion Detected: ${r.emotion_detected}
Honesty Score: ${r.honesty_score}
Tone Analysis: ${JSON.stringify(r.tone_analysis)}
`).join('\n')}

TASK:
Create a comprehensive personality analysis that integrates both astrological insights and psychological patterns. Be specific, personal, and avoid generic descriptions.

REQUIRED OUTPUT FORMAT (JSON):
{
  "archetype": {
    "name": "Creative archetype name (e.g., 'The Cosmic Weaver', 'The Lunar Strategist')",
    "description": "2-3 sentence description of this archetype",
    "inspirationalLine": "A poetic, inspiring one-liner that captures their essence",
    "coreTraits": ["trait1", "trait2", "trait3"],
    "strengths": ["strength1", "strength2", "strength3"],
    "challenges": ["challenge1", "challenge2", "challenge3"],
    "growthAreas": ["area1", "area2", "area3"]
  },
  "summaryShort": "2-3 sentence personality summary",
  "summaryDetailed": "Detailed 4-5 sentence personality breakdown",
  "astrologyBreakdown": "How their astrological placements manifest in their personality",
  "psychologyInsights": "Insights from their psychological responses and patterns",
  "mindVsHeart": "Analysis of the tension/harmony between their logical mind and emotional heart",
  "affirmations": "3-4 personalized affirmations based on their specific needs",
  "confidenceScore": 0.85
}

Focus on:
1. Specific contradictions or tensions revealed in their responses
2. How their astrological placements explain their psychological patterns
3. Unique insights that feel personal and accurate
4. Growth opportunities that honor both their strengths and challenges
5. Poetic but practical language that resonates emotionally

Be deeply human, avoid generic astrology descriptions, and make every insight feel personally crafted for this individual.`;
  }

  private parseAIResponse(response: string): PersonalityAnalysis {
    try {
      // Extract JSON from response (handle potential markdown formatting)
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in AI response');
      }
      
      const parsed = JSON.parse(jsonMatch[0]);
      
      // Validate required fields
      if (!parsed.archetype || !parsed.summaryShort || !parsed.summaryDetailed) {
        throw new Error('Missing required fields in AI response');
      }
      
      return {
        archetype: {
          name: parsed.archetype.name || 'The Seeker',
          description: parsed.archetype.description || 'A unique individual on a journey of self-discovery.',
          inspirationalLine: parsed.archetype.inspirationalLine || 'You are exactly where you need to be.',
          coreTraits: parsed.archetype.coreTraits || ['intuitive', 'thoughtful', 'evolving'],
          strengths: parsed.archetype.strengths || ['self-aware', 'empathetic', 'resilient'],
          challenges: parsed.archetype.challenges || ['overthinking', 'self-doubt', 'perfectionism'],
          growthAreas: parsed.archetype.growthAreas || ['self-compassion', 'boundaries', 'trust']
        },
        summaryShort: parsed.summaryShort,
        summaryDetailed: parsed.summaryDetailed,
        astrologyBreakdown: parsed.astrologyBreakdown || 'Your astrological chart reveals a complex and fascinating personality.',
        psychologyInsights: parsed.psychologyInsights || 'Your responses show deep self-awareness and emotional intelligence.',
        mindVsHeart: parsed.mindVsHeart || 'You navigate the balance between logic and emotion with growing wisdom.',
        affirmations: parsed.affirmations || 'I trust my journey. I honor my growth. I embrace my authentic self.',
        confidenceScore: parsed.confidenceScore || 0.8
      };
    } catch (error) {
      console.error('Failed to parse AI response:', error);
      throw new Error('Invalid AI response format');
    }
  }

  private generateFallbackAnalysis(astrologyReport: AstrologyReport, psychResponses: PsychResponse[]): PersonalityAnalysis {
    const chart = astrologyReport.chart_json;
    
    // Simple fallback based on sun/moon combination
    const sunMoonCombo = `${chart.sun.sign} Sun, ${chart.moon.sign} Moon`;
    
    return {
      archetype: {
        name: 'The Cosmic Explorer',
        description: 'A thoughtful individual navigating the balance between inner wisdom and outer expression.',
        inspirationalLine: 'You carry both starlight and earthbound wisdom within you.',
        coreTraits: ['introspective', 'authentic', 'evolving'],
        strengths: ['self-awareness', 'emotional depth', 'adaptability'],
        challenges: ['overthinking', 'self-criticism', 'perfectionism'],
        growthAreas: ['self-compassion', 'trust in process', 'embracing imperfection']
      },
      summaryShort: `As a ${sunMoonCombo}, you blend the qualities of your sun and moon signs in unique ways, creating a personality that is both complex and authentic.`,
      summaryDetailed: `Your ${chart.sun.sign} sun drives your core identity and life purpose, while your ${chart.moon.sign} moon governs your emotional world and intuitive responses. This combination creates a fascinating interplay between your public self and private inner world. Your responses reveal someone who thinks deeply about life and relationships, with a strong desire for authenticity and meaningful connection.`,
      astrologyBreakdown: `Your ${chart.sun.sign} sun in the ${chart.sun.house}th house suggests a focus on ${this.getHouseMeaning(chart.sun.house)}, while your ${chart.moon.sign} moon in the ${chart.moon.house}th house indicates emotional needs around ${this.getHouseMeaning(chart.moon.house)}.`,
      psychologyInsights: `Your responses show a pattern of thoughtful self-reflection and emotional awareness. You tend to process experiences deeply and value authenticity in yourself and others.`,
      mindVsHeart: `There's an interesting dynamic between your analytical mind and intuitive heart. You often seek to understand your emotions intellectually, which can be both a strength and a source of internal tension.`,
      affirmations: `I trust my unique journey of growth. I honor both my mind and my heart. I am exactly where I need to be in this moment. My authenticity is my greatest strength.`,
      confidenceScore: 0.75
    };
  }

  private getHouseMeaning(house: number): string {
    const houseMeanings = {
      1: 'self-identity and personal expression',
      2: 'values, resources, and self-worth',
      3: 'communication and learning',
      4: 'home, family, and emotional foundation',
      5: 'creativity, romance, and self-expression',
      6: 'service, health, and daily routines',
      7: 'partnerships and relationships',
      8: 'transformation and shared resources',
      9: 'philosophy, higher learning, and expansion',
      10: 'career, reputation, and public image',
      11: 'friendships, groups, and future goals',
      12: 'spirituality, subconscious, and release'
    };
    return houseMeanings[house] || 'personal growth';
  }

  private async saveAIAnalysis(
    userId: string,
    analysisType: string,
    inputData: any,
    aiResponse: any,
    processingTime: number
  ): Promise<void> {
    const { error } = await supabase
      .from('ai_analysis')
      .insert({
        user_id: userId,
        analysis_type: analysisType,
        input_data: inputData,
        ai_response: aiResponse,
        model_used: 'gemini-pro',
        confidence_score: aiResponse.confidenceScore,
        processing_time_ms: processingTime
      });

    if (error) {
      console.error('Failed to save AI analysis:', error);
    }
  }

  async generateQuestionBasedOnResponse(
    previousResponse: PsychResponse,
    allResponses: PsychResponse[]
  ): Promise<string> {
    const prompt = `You are an expert psychologist conducting a personality assessment. 

Based on this previous response:
Question: ${previousResponse.question}
Answer: ${previousResponse.answer}
Emotion: ${previousResponse.emotion_detected}
Honesty Score: ${previousResponse.honesty_score}

And considering their overall response pattern, generate a thoughtful follow-up question that:
1. Explores deeper psychological territory
2. Reveals potential contradictions or hidden aspects
3. Feels natural and conversational
4. Avoids being too direct or confrontational

Return only the question, no explanation.`;

    try {
      return await this.callGeminiAPI(prompt);
    } catch (error) {
      console.error('Failed to generate dynamic question:', error);
      return "What's something about yourself that you're still discovering?";
    }
  }
}

export const aiService = new AIService();