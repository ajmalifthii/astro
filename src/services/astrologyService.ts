import { supabase, type AstrologyReport } from '../lib/supabase';

export interface BirthData {
  name: string;
  birthDate: string;
  birthTime?: string;
  birthPlace: string;
  latitude: number;
  longitude: number;
  timezone?: string;
}

export interface AstrologyChart {
  sun: { sign: string; degree: number; house: number };
  moon: { sign: string; degree: number; house: number };
  rising: { sign: string; degree: number };
  planets: Array<{
    name: string;
    sign: string;
    degree: number;
    house: number;
    retrograde: boolean;
  }>;
  houses: Array<{
    number: number;
    sign: string;
    degree: number;
  }>;
  aspects: Array<{
    planet1: string;
    planet2: string;
    aspect: string;
    degree: number;
    orb: number;
  }>;
  elements: {
    fire: number;
    earth: number;
    air: number;
    water: number;
  };
  modalities: {
    cardinal: number;
    fixed: number;
    mutable: number;
  };
}

// Mock astrology calculation - in production, use a real astrology library
export function calculateAstrologyChart(birthData: BirthData): AstrologyChart {
  // This is a simplified mock calculation
  // In production, you would use libraries like:
  // - Swiss Ephemeris
  // - Astro-seek API
  // - TimePassages API
  
  const signs = [
    'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
    'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
  ];
  
  const planets = ['Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];
  
  // Mock calculation based on birth date
  const birthDate = new Date(birthData.birthDate);
  const dayOfYear = Math.floor((birthDate.getTime() - new Date(birthDate.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
  
  // Calculate sun sign based on approximate dates
  const sunSignIndex = Math.floor((dayOfYear - 80) / 30.4) % 12;
  const sunSign = signs[sunSignIndex < 0 ? sunSignIndex + 12 : sunSignIndex];
  
  // Mock moon and rising signs with some variation
  const moonSignIndex = (sunSignIndex + Math.floor(dayOfYear / 2.5)) % 12;
  const risingSignIndex = (sunSignIndex + Math.floor(dayOfYear / 15)) % 12;
  
  const chart: AstrologyChart = {
    sun: {
      sign: sunSign,
      degree: (dayOfYear % 30) + Math.random() * 5,
      house: Math.floor(Math.random() * 12) + 1
    },
    moon: {
      sign: signs[moonSignIndex],
      degree: Math.random() * 30,
      house: Math.floor(Math.random() * 12) + 1
    },
    rising: {
      sign: signs[risingSignIndex],
      degree: Math.random() * 30
    },
    planets: planets.map((planet, index) => ({
      name: planet,
      sign: signs[(sunSignIndex + index + 1) % 12],
      degree: Math.random() * 30,
      house: Math.floor(Math.random() * 12) + 1,
      retrograde: Math.random() < 0.2
    })),
    houses: Array.from({ length: 12 }, (_, i) => ({
      number: i + 1,
      sign: signs[(risingSignIndex + i) % 12],
      degree: Math.random() * 30
    })),
    aspects: [
      {
        planet1: 'Sun',
        planet2: 'Moon',
        aspect: 'Trine',
        degree: 120,
        orb: 3.2
      },
      {
        planet1: 'Venus',
        planet2: 'Mars',
        aspect: 'Square',
        degree: 90,
        orb: 2.1
      }
    ],
    elements: {
      fire: Math.floor(Math.random() * 5) + 1,
      earth: Math.floor(Math.random() * 5) + 1,
      air: Math.floor(Math.random() * 5) + 1,
      water: Math.floor(Math.random() * 5) + 1
    },
    modalities: {
      cardinal: Math.floor(Math.random() * 5) + 1,
      fixed: Math.floor(Math.random() * 5) + 1,
      mutable: Math.floor(Math.random() * 5) + 1
    }
  };
  
  return chart;
}

export async function generateAstrologyReport(
  userId: string,
  birthData: BirthData
): Promise<AstrologyReport> {
  const chart = calculateAstrologyChart(birthData);
  const birthDate = new Date(birthData.birthDate);
  const today = new Date();
  
  // Calculate age
  let ageYears = today.getFullYear() - birthDate.getFullYear();
  let ageMonths = today.getMonth() - birthDate.getMonth();
  
  if (ageMonths < 0 || (ageMonths === 0 && today.getDate() < birthDate.getDate())) {
    ageYears--;
    ageMonths += 12;
  }
  
  const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const birthWeekday = weekdays[birthDate.getDay()];
  
  const reportData = {
    user_id: userId,
    chart_json: chart,
    sun_sign: chart.sun.sign,
    moon_sign: chart.moon.sign,
    rising_sign: chart.rising.sign,
    dominant_elements: chart.elements,
    planetary_positions: chart.planets,
    house_positions: chart.houses,
    aspects: chart.aspects,
    age_years: ageYears,
    age_months: ageMonths,
    birth_weekday: birthWeekday
  };
  
  const { data, error } = await supabase
    .from('astrology_reports')
    .insert(reportData)
    .select()
    .single();
  
  if (error) {
    throw new Error(`Failed to save astrology report: ${error.message}`);
  }
  
  return data;
}

export async function getAstrologyReport(userId: string): Promise<AstrologyReport | null> {
  const { data, error } = await supabase
    .from('astrology_reports')
    .select('*')
    .eq('user_id', userId)
    .order('generated_at', { ascending: false })
    .limit(1)
    .single();
  
  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to fetch astrology report: ${error.message}`);
  }
  
  return data || null;
}