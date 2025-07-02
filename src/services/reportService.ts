import { supabase, type FinalReport } from '../lib/supabase';
import { aiService, type PersonalityAnalysis } from './aiService';
import { getAstrologyReport } from './astrologyService';
import jsPDF from 'jspdf';

export async function generateFinalReport(
  userId: string, 
  sessionId: string, 
  conversationData: Record<string, any>
): Promise<FinalReport> {
  try {
    // Fetch astrology report
    const astrologyReport = await getAstrologyReport(userId);
    if (!astrologyReport) {
      throw new Error('Astrology report not found');
    }

    // Create mock psychology responses from conversation data
    const mockPsychResponses = [{
      id: sessionId,
      user_id: userId,
      session_id: sessionId,
      question_id: 1,
      question: 'Conversational Assessment',
      answer: JSON.stringify(conversationData),
      response_method: 'text' as const,
      tone_analysis: { confidence: 0.8, authenticity: 0.9 },
      emotion_detected: 'thoughtful',
      honesty_score: 0.85,
      confidence_level: 0.8,
      response_time_seconds: 300,
      word_count: JSON.stringify(conversationData).length,
      created_at: new Date().toISOString()
    }];

    // Generate AI analysis
    const analysis = await aiService.generatePersonalityAnalysis(
      userId,
      astrologyReport,
      mockPsychResponses
    );

    // Create final report
    const reportData = {
      user_id: userId,
      report_title: `Cosmic Blueprint for ${astrologyReport.chart_json.sun.sign} Soul`,
      archetype_name: analysis.archetype.name,
      archetype_description: analysis.archetype.description,
      inspirational_line: analysis.archetype.inspirationalLine,
      summary_short: analysis.summaryShort,
      summary_detailed: analysis.summaryDetailed,
      astrology_breakdown: analysis.astrologyBreakdown,
      psychology_insights: analysis.psychologyInsights,
      mind_vs_heart: analysis.mindVsHeart,
      strengths: analysis.archetype.strengths.join(', '),
      challenges: analysis.archetype.challenges.join(', '),
      growth_areas: analysis.archetype.growthAreas.join(', '),
      affirmations: analysis.affirmations,
      pdf_generated: false,
      shared_publicly: false
    };

    const { data: report, error } = await supabase
      .from('final_reports')
      .insert(reportData)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to save final report: ${error.message}`);
    }

    return report;
  } catch (error) {
    console.error('Error generating final report:', error);
    throw error;
  }
}

export async function generatePDF(reportId: string): Promise<string> {
  const { data: report, error } = await supabase
    .from('final_reports')
    .select('*')
    .eq('id', reportId)
    .single();

  if (error || !report) {
    throw new Error('Report not found');
  }

  // Create enhanced PDF
  const pdf = new jsPDF();
  const pageWidth = pdf.internal.pageSize.getWidth();
  const margin = 20;
  const lineHeight = 7;
  let yPosition = 30;

  // Helper function to add text with word wrapping
  const addWrappedText = (text: string, fontSize: number = 11, isBold: boolean = false) => {
    pdf.setFontSize(fontSize);
    if (isBold) {
      pdf.setFont(undefined, 'bold');
    } else {
      pdf.setFont(undefined, 'normal');
    }
    
    const lines = pdf.splitTextToSize(text, pageWidth - 2 * margin);
    lines.forEach((line: string) => {
      if (yPosition > pdf.internal.pageSize.getHeight() - 30) {
        pdf.addPage();
        yPosition = 30;
      }
      pdf.text(line, margin, yPosition);
      yPosition += lineHeight;
    });
    yPosition += 3;
  };

  // Enhanced header with branding
  pdf.setFillColor(128, 0, 128);
  pdf.rect(0, 0, pageWidth, 25, 'F');
  
  pdf.setFontSize(24);
  pdf.setFont(undefined, 'bold');
  pdf.setTextColor(255, 255, 255);
  pdf.text('AstroPsyche', margin, 18);
  
  pdf.setFontSize(12);
  pdf.setFont(undefined, 'normal');
  pdf.text('Your Cosmic Blueprint', pageWidth - margin, 18, { align: 'right' });

  yPosition = 40;
  pdf.setTextColor(0, 0, 0);

  // Title
  pdf.setFontSize(20);
  pdf.setFont(undefined, 'bold');
  pdf.setTextColor(128, 0, 128);
  pdf.text(report.report_title, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 15;

  // Archetype section
  pdf.setTextColor(0, 0, 0);
  addWrappedText(`Archetype: ${report.archetype_name}`, 16, true);
  
  if (report.inspirational_line) {
    pdf.setTextColor(100, 100, 100);
    pdf.setFont(undefined, 'italic');
    addWrappedText(`"${report.inspirational_line}"`, 12);
    pdf.setTextColor(0, 0, 0);
    pdf.setFont(undefined, 'normal');
  }

  yPosition += 5;

  // Content sections
  const sections = [
    { title: 'Core Insights', content: report.summary_detailed },
    { title: 'Astrological Foundation', content: report.astrology_breakdown },
    { title: 'Psychological Patterns', content: report.psychology_insights },
    { title: 'Mind vs. Heart', content: report.mind_vs_heart },
    { title: 'Your Strengths', content: report.strengths },
    { title: 'Growth Opportunities', content: report.challenges },
    { title: 'Personal Affirmations', content: report.affirmations }
  ];

  sections.forEach(section => {
    if (section.content) {
      addWrappedText(section.title, 14, true);
      if (section.title === 'Personal Affirmations') {
        pdf.setTextColor(128, 0, 128);
      }
      addWrappedText(section.content);
      pdf.setTextColor(0, 0, 0);
      yPosition += 3;
    }
  });

  // Footer
  pdf.setTextColor(150, 150, 150);
  pdf.setFontSize(8);
  const footerY = pdf.internal.pageSize.getHeight() - 15;
  pdf.text('Generated by AstroPsyche', pageWidth / 2, footerY, { align: 'center' });
  pdf.text(`Generated on ${new Date().toLocaleDateString()}`, pageWidth / 2, footerY + 5, { align: 'center' });

  // Convert to blob and create URL
  const pdfBlob = pdf.output('blob');
  const pdfUrl = URL.createObjectURL(pdfBlob);

  // Update report with PDF URL
  const { error: updateError } = await supabase
    .from('final_reports')
    .update({ 
      pdf_url: pdfUrl, 
      pdf_generated: true 
    })
    .eq('id', reportId);

  if (updateError) {
    console.error('Failed to update report with PDF URL:', updateError);
  }

  return pdfUrl;
}

export async function getFinalReport(userId: string): Promise<FinalReport | null> {
  const { data, error } = await supabase
    .from('final_reports')
    .select('*')
    .eq('user_id', userId)
    .order('generated_at', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to fetch final report: ${error.message}`);
  }

  return data || null;
}

export async function shareReport(reportId: string, makePublic: boolean = true): Promise<string> {
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
}