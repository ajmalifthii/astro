import { supabase, type AstrologyReport, isDemoMode } from '../lib/supabase';

export interface BirthData {
  name: string;
  birthDate: string;
  birthTime?: string;
  birthPlace: string;
  latitude: number;
  longitude: number;
  timezone?: string;
}

export async function generateAstrologyReport(userId: string, birthData: BirthData): Promise<AstrologyReport | null> {
  try {
    // Generate astrological chart data
    const chartData = await calculateAstrologyChart(birthData);
    
    const reportData = {
      id: `astro-${Date.now()}`,
      user_id: userId,
      chart_json: chartData,
      sun_sign: chartData.sunSign,
      moon_sign: chartData.moonSign,
      rising_sign: chartData.risingSign,
      dominant_elements: chartData.dominantElements,
      planetary_positions: chartData.planetaryPositions,
      house_positions: chartData.housePositions,
      aspects: chartData.aspects,
      generated_at: new Date().toISOString(),
      age_years: calculateAge(birthData.birthDate).years,
      age_months: calculateAge(birthData.birthDate).months,
      birth_weekday: new Date(birthData.birthDate).toLocaleDateString('en-US', { weekday: 'long' }),
      generation_date: new Date().toISOString().split('T')[0],
      confidence_score: 0.85
    };

    // Try to save to database, fallback to localStorage
    if (!isDemoMode() && supabase) {
      try {
        const { data, error } = await supabase
          .from('astrology_reports')
          .insert(reportData)
          .select()
          .single();

        if (error) {
          console.warn('Failed to save astrology report to database:', error);
          saveAstrologyToLocalStorage(reportData);
          return reportData;
        }

        return data;
      } catch (error) {
        console.warn('Database operation failed, using local storage:', error);
        saveAstrologyToLocalStorage(reportData);
        return reportData;
      }
    } else {
      // Demo mode - save to localStorage
      saveAstrologyToLocalStorage(reportData);
      return reportData;
    }
  } catch (error) {
    console.error('Failed to generate astrology report:', error);
    return null;
  }
}

function saveAstrologyToLocalStorage(report: AstrologyReport) {
  const existingReports = JSON.parse(localStorage.getItem('astropsyche_astrology') || '[]');
  existingReports.push(report);
  localStorage.setItem('astropsyche_astrology', JSON.stringify(existingReports));
}

async function calculateAstrologyChart(birthData: BirthData) {
  // Simulate astrological calculations
  // In a real app, this would use an astronomy library like Swiss Ephemeris
  
  const birthDate = new Date(birthData.birthDate);
  const dayOfYear = Math.floor((birthDate.getTime() - new Date(birthDate.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
  
  // Simple zodiac sign calculation based on day of year
  const zodiacSigns = [
    'Capricorn', 'Aquarius', 'Pisces', 'Aries', 'Taurus', 'Gemini',
    'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius'
  ];
  
  const sunSignIndex = Math.floor((dayOfYear + 10) / 30.4) % 12;
  const moonSignIndex = (sunSignIndex + Math.floor(Math.random() * 12)) % 12;
  const risingSignIndex = (sunSignIndex + Math.floor(Math.random() * 12)) % 12;
  
  return {
    sunSign: zodiacSigns[sunSignIndex],
    moonSign: zodiacSigns[moonSignIndex],
    risingSign: zodiacSigns[risingSignIndex],
    dominantElements: {
      fire: Math.random() * 100,
      earth: Math.random() * 100,
      air: Math.random() * 100,
      water: Math.random() * 100
    },
    planetaryPositions: {
      sun: { sign: zodiacSigns[sunSignIndex], degree: Math.random() * 30 },
      moon: { sign: zodiacSigns[moonSignIndex], degree: Math.random() * 30 },
      mercury: { sign: zodiacSigns[(sunSignIndex + 1) % 12], degree: Math.random() * 30 },
      venus: { sign: zodiacSigns[(sunSignIndex + 2) % 12], degree: Math.random() * 30 },
      mars: { sign: zodiacSigns[(sunSignIndex + 3) % 12], degree: Math.random() * 30 }
    },
    housePositions: Array.from({ length: 12 }, (_, i) => ({
      house: i + 1,
      sign: zodiacSigns[(sunSignIndex + i) % 12],
      cusp: Math.random() * 30
    })),
    aspects: [
      { planet1: 'Sun', planet2: 'Moon', aspect: 'Trine', orb: 3.2 },
      { planet1: 'Venus', planet2: 'Mars', aspect: 'Conjunction', orb: 1.8 },
      { planet1: 'Mercury', planet2: 'Jupiter', aspect: 'Sextile', orb: 2.1 }
    ]
  };
}

function calculateAge(birthDate: string) {
  const birth = new Date(birthDate);
  const now = new Date();
  
  let years = now.getFullYear() - birth.getFullYear();
  let months = now.getMonth() - birth.getMonth();
  
  if (months < 0) {
    years--;
    months += 12;
  }
  
  return { years, months };
}