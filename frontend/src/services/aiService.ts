import Constants from 'expo-constants';

export interface FreshnessInput {
  foodType: string;
  preparationTime: Date;
  bestBeforeDate: Date;
  temperature: number;
}

export const predictFreshness = (input: FreshnessInput): number => {
  const { foodType, preparationTime, bestBeforeDate, temperature } = input;
  const now = new Date();
  
  if (now >= new Date(bestBeforeDate)) {
    return 0;
  }
  
  const prep = new Date(preparationTime).getTime();
  const exp = new Date(bestBeforeDate).getTime();
  const current = now.getTime();
  
  if (current < prep) {
    return 100;
  }
  
  const totalShelfLifeMs = exp - prep;
  if (totalShelfLifeMs <= 0) return 0;
  
  const elapsedMs = current - prep;
  const elapsedHours = elapsedMs / (1000 * 60 * 60);
  
  let baseDecayRate = 2.0;
  switch (foodType) {
    case 'Cooked Food':
      baseDecayRate = 8.0;
      break;
    case 'Bakery Items':
      baseDecayRate = 4.0;
      break;
    case 'Vegetables':
      baseDecayRate = 1.5;
      break;
    case 'Fruits':
      baseDecayRate = 1.2;
      break;
    case 'Beverages':
      baseDecayRate = 3.0;
      break;
    case 'Grocery Items':
      baseDecayRate = 0.1;
      break;
  }
  
  let tempFactor = 1.0;
  if (temperature > 35) {
    tempFactor = 2.2;
  } else if (temperature > 28) {
    tempFactor = 1.6;
  } else if (temperature > 20) {
    tempFactor = 1.0;
  } else if (temperature > 4) {
    tempFactor = 0.4;
  } else {
    tempFactor = 0.15;
  }
  
  const decayPercentage = elapsedHours * baseDecayRate * tempFactor;
  let score = 100 - decayPercentage;
  
  const timeRatioLeft = (exp - current) / totalShelfLifeMs;
  const timeRatioScore = timeRatioLeft * 100;
  
  score = Math.min(score, timeRatioScore);
  return Math.max(0, Math.min(100, Math.round(score)));
};

export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return Math.round(distance * 100) / 100;
};

// ─── FOODREACH FRONTEND AI CHATBOT GROQ REST SERVICE ──────────────────────────

export interface ChatMessageItem {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
}

const SYSTEM_PROMPT = `You are FoodReach AI. You answer only FoodReach related questions. If the question is unrelated politely respond: "I can assist only with FoodReach features, food donation, NGOs, volunteers and food safety."`;

/**
 * Resolves the EXPO_PUBLIC_GROQ_API_KEY reliably across Expo Android (Native) and Expo Web
 */
export const getGroqApiKey = (): string => {
  const envPublic = (process.env as any)?.EXPO_PUBLIC_GROQ_API_KEY;
  if (envPublic && typeof envPublic === 'string' && envPublic.trim().length > 0) {
    return envPublic.trim();
  }

  const envGroq = (process.env as any)?.GROQ_API_KEY;
  if (envGroq && typeof envGroq === 'string' && envGroq.trim().length > 0) {
    return envGroq.trim();
  }

  const extraConfig = Constants?.expoConfig?.extra;
  if (extraConfig?.EXPO_PUBLIC_GROQ_API_KEY && typeof extraConfig.EXPO_PUBLIC_GROQ_API_KEY === 'string') {
    if (extraConfig.EXPO_PUBLIC_GROQ_API_KEY.trim().length > 0) {
      return extraConfig.EXPO_PUBLIC_GROQ_API_KEY.trim();
    }
  }

  const manifestExtra = (Constants?.manifest as any)?.extra;
  if (manifestExtra?.EXPO_PUBLIC_GROQ_API_KEY && typeof manifestExtra.EXPO_PUBLIC_GROQ_API_KEY === 'string') {
    if (manifestExtra.EXPO_PUBLIC_GROQ_API_KEY.trim().length > 0) {
      return manifestExtra.EXPO_PUBLIC_GROQ_API_KEY.trim();
    }
  }

  const globalWin =
    (typeof window !== 'undefined' && (window as any).EXPO_PUBLIC_GROQ_API_KEY) ||
    (typeof global !== 'undefined' && (global as any).EXPO_PUBLIC_GROQ_API_KEY);
  if (globalWin && typeof globalWin === 'string' && globalWin.trim().length > 0) {
    return globalWin.trim();
  }

  return '';
};

/**
 * Sends user message directly to Groq REST API using model llama-3.3-70b-versatile
 */
export const sendMessage = async (
  userMessage: string,
  chatHistory: ChatMessageItem[] = []
): Promise<string> => {
  const apiKey = getGroqApiKey();

  if (!apiKey) {
    const errorMsg = 'Groq API Key not configured.';
    console.error('[Groq API Error]', errorMsg);
    throw new Error(errorMsg);
  }

  const endpoint = 'https://api.groq.com/openai/v1/chat/completions';

  const formattedHistory = chatHistory.slice(-8).map((m) => ({
    role: m.sender === 'user' ? 'user' : 'assistant',
    content: m.text,
  }));

  const payload = {
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      ...formattedHistory,
      { role: 'user', content: userMessage },
    ],
    temperature: 0.7,
    max_tokens: 500,
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const rawText = await response.text();
  let data: any = {};
  try {
    data = JSON.parse(rawText);
  } catch (parseErr) {
    console.error('[Groq API Parse Error]', rawText);
  }

  if (!response.ok) {
    const errMsg = data?.error?.message || `Groq API HTTP Error ${response.status}: ${response.statusText}`;
    console.error('[Groq API Error]', errMsg);
    throw new Error(`API Error: ${errMsg}`);
  }

  const replyText = data?.choices?.[0]?.message?.content;
  if (replyText && typeof replyText === 'string') {
    return replyText.trim();
  }

  throw new Error('Groq API returned an empty response.');
};

export const generateAIChatResponse = sendMessage;

export const aiService = {
  sendMessage,
  generateAIChatResponse,
  predictFreshness,
  calculateDistance,
  getGroqApiKey,
};
