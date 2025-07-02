import { supabase, type FinalReport, isDemoMode } from '../lib/supabase';

export async function generateFinalReport(
  userId: string, 
  sessionId: string, 
  conversationData: Record<string, any>
): Promise<FinalReport> {
  // Generate a comprehensive personality report based on conversation data
  const archetype = determineArchetype(conversationData);
  const insights = generateInsights(conversationData);
  
  const reportData = {
    id: `report-${Date.now()}`,
    user_id: userId,
    report_title: `Cosmic Blueprint for ${conversationData.name || 'You'}`,
    archetype_name: archetype.name,
    archetype_description: archetype.description,
    inspirational_line: archetype.inspirationalLine,
    summary_short: insights.summaryShort,
    summary_detailed: insights.summaryDetailed,
    astrology_breakdown: insights.astrologyBreakdown,
    psychology_insights: insights.psychologyInsights,
    mind_vs_heart: insights.mindVsHeart,
    strengths: insights.strengths,
    challenges: insights.challenges,
    growth_areas: insights.growthAreas,
    affirmations: insights.affirmations,
    pdf_generated: false,
    shared_publicly: false,
    share_token: `share-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    generated_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  // Try to save to database, fallback to localStorage
  if (!isDemoMode() && supabase) {
    try {
      const { data, error } = await supabase
        .from('final_reports')
        .insert(reportData)
        .select()
        .single();

      if (error) {
        console.warn('Failed to save report to database, using local storage:', error);
        saveReportToLocalStorage(reportData);
        return reportData;
      }

      return data;
    } catch (error) {
      console.warn('Database operation failed, using local storage:', error);
      saveReportToLocalStorage(reportData);
      return reportData;
    }
  } else {
    // Demo mode - save to localStorage
    saveReportToLocalStorage(reportData);
    return reportData;
  }
}

function saveReportToLocalStorage(report: FinalReport) {
  const existingReports = JSON.parse(localStorage.getItem('astropsyche_reports') || '[]');
  existingReports.push(report);
  localStorage.setItem('astropsyche_reports', JSON.stringify(existingReports));
}

function determineArchetype(conversationData: Record<string, any>) {
  // Analyze conversation data to determine personality archetype
  const responses = Object.values(conversationData).join(' ').toLowerCase();
  
  // Simple keyword-based archetype determination
  if (responses.includes('creative') || responses.includes('art') || responses.includes('imagination')) {
    return {
      name: 'The Visionary Creator',
      description: 'A soul driven by imagination and the desire to bring beauty into the world.',
      inspirationalLine: 'Your creativity is your superpower - use it to illuminate the world.'
    };
  } else if (responses.includes('help') || responses.includes('care') || responses.includes('support')) {
    return {
      name: 'The Compassionate Guide',
      description: 'A natural healer who finds purpose in lifting others up.',
      inspirationalLine: 'Your empathy is a gift that transforms lives wherever you go.'
    };
  } else if (responses.includes('learn') || responses.includes('knowledge') || responses.includes('understand')) {
    return {
      name: 'The Wise Seeker',
      description: 'An eternal student of life, always growing and evolving.',
      inspirationalLine: 'Your curiosity opens doors to infinite possibilities.'
    };
  } else if (responses.includes('lead') || responses.includes('change') || responses.includes('impact')) {
    return {
      name: 'The Transformative Leader',
      description: 'A catalyst for positive change in the world.',
      inspirationalLine: 'Your vision has the power to reshape reality.'
    };
  } else {
    return {
      name: 'The Balanced Explorer',
      description: 'A harmonious soul who finds beauty in life\'s journey.',
      inspirationalLine: 'Your authentic self is exactly what the world needs.'
    };
  }
}

function generateInsights(conversationData: Record<string, any>) {
  const archetype = determineArchetype(conversationData);
  
  return {
    summaryShort: `You are ${archetype.name}, a unique individual with a special gift for bringing your authentic self to everything you do.`,
    summaryDetailed: `Your cosmic blueprint reveals a complex and fascinating personality. Through our conversation, it's clear that you possess a rare combination of introspection and action. You think deeply about life's meaning while maintaining the courage to pursue your authentic path. Your responses show someone who values genuine connection and isn't afraid to be vulnerable when it matters. This balance between wisdom and authenticity makes you a natural guide for others seeking their own truth.`,
    astrologyBreakdown: `Your astrological influences suggest a personality that thrives on both stability and change. The planetary alignments at your birth created someone who can adapt to life's challenges while maintaining a strong sense of self. Your chart indicates natural leadership abilities combined with deep emotional intelligence.`,
    psychologyInsights: `Psychologically, you demonstrate high emotional awareness and the ability to process complex feelings. Your responses indicate someone who has done significant inner work and continues to grow. You show patterns of healthy boundary-setting and authentic self-expression.`,
    mindVsHeart: `You've achieved a remarkable balance between logical thinking and emotional wisdom. Rather than seeing these as opposing forces, you've learned to integrate both, making decisions that honor both your rational mind and your intuitive heart.`,
    strengths: `Your greatest strengths include authentic self-expression, emotional intelligence, adaptability, and the courage to be vulnerable. You have a natural ability to see the bigger picture while attending to important details.`,
    challenges: `Your main challenges may include overthinking decisions, being too hard on yourself, and occasionally struggling with perfectionism. Learning to trust your first instincts more could serve you well.`,
    growthAreas: `Focus on developing even greater self-compassion and trusting your intuitive wisdom. Consider exploring creative outlets that allow for free expression without judgment.`,
    affirmations: `I trust my inner wisdom. I am worthy of love and belonging exactly as I am. My authentic self is my greatest gift to the world. I embrace both my strengths and my growth edges with compassion.`
  };
}

export async function generatePDF(reportId: string): Promise<string | null> {
  // In a real implementation, this would generate a PDF
  // For demo purposes, we'll return a mock URL
  console.log('Generating PDF for report:', reportId);
  
  // Simulate PDF generation delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Return a mock PDF URL
  return `data:application/pdf;base64,JVBERi0xLjQKJdPr6eEKMSAwIG9iago8PAovVGl0bGUgKFlvdXIgQ29zbWljIEJsdWVwcmludCkKL0NyZWF0b3IgKEFzdHJvUHN5Y2hlKQovUHJvZHVjZXIgKEFzdHJvUHN5Y2hlKQovQ3JlYXRpb25EYXRlIChEOjIwMjQwMTAxMTIwMDAwWikKPj4KZW5kb2JqCjIgMCBvYmoKPDwKL1R5cGUgL0NhdGFsb2cKL1BhZ2VzIDMgMCBSCj4+CmVuZG9iagozIDAgb2JqCjw8Ci9UeXBlIC9QYWdlcwovS2lkcyBbNCAwIFJdCi9Db3VudCAxCj4+CmVuZG9iago0IDAgb2JqCjw8Ci9UeXBlIC9QYWdlCi9QYXJlbnQgMyAwIFIKL01lZGlhQm94IFswIDAgNjEyIDc5Ml0KL0NvbnRlbnRzIDUgMCBSCj4+CmVuZG9iago1IDAgb2JqCjw8Ci9MZW5ndGggNDQKPj4Kc3RyZWFtCkJUCi9GMSAxMiBUZgoxMDAgNzAwIFRkCihZb3VyIENvc21pYyBCbHVlcHJpbnQpIFRqCkVUCmVuZHN0cmVhbQplbmRvYmoKeHJlZgowIDYKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDA5IDAwMDAwIG4gCjAwMDAwMDAxNTggMDAwMDAgbiAKMDAwMDAwMDIwOCAwMDAwMCBuIAowMDAwMDAwMjY1IDAwMDAwIG4gCjAwMDAwMDAzNjIgMDAwMDAgbiAKdHJhaWxlcgo8PAovU2l6ZSA2Ci9Sb290IDIgMCBSCj4+CnN0YXJ0eHJlZgo0NTYKJSVFT0Y=`;
}

export async function shareReport(reportId: string): Promise<string> {
  // Generate a shareable URL
  const shareToken = `share-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const baseUrl = window.location.origin;
  return `${baseUrl}/shared/${shareToken}`;
}