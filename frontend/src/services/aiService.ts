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
    return 100; // Preparation is set in the future or current is slightly off
  }
  
  const totalShelfLifeMs = exp - prep;
  if (totalShelfLifeMs <= 0) return 0;
  
  const elapsedMs = current - prep;
  const elapsedHours = elapsedMs / (1000 * 60 * 60);
  
  // Base hourly decay rates for different food categories (percentage loss per hour)
  let baseDecayRate = 2.0; // standard 2% decay per hour
  switch (foodType) {
    case 'Cooked Food':
      baseDecayRate = 8.0; // Decays rapidly (approx 12 hours shelf life at room temp)
      break;
    case 'Bakery Items':
      baseDecayRate = 4.0; // Decays moderately fast
      break;
    case 'Vegetables':
      baseDecayRate = 1.5; // Decays slowly
      break;
    case 'Fruits':
      baseDecayRate = 1.2;
      break;
    case 'Beverages':
      baseDecayRate = 3.0; // Fresh juices decay, bottled ones do not
      break;
    case 'Grocery Items':
      baseDecayRate = 0.1; // Canned/dry items decay extremely slowly
      break;
  }
  
  // Temperature multipliers (decay is accelerated at higher temps)
  // Optimal storage is assumed < 8C for cooked food
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
    tempFactor = 0.15; // Frozen/Refrigerated
  }
  
  const decayPercentage = elapsedHours * baseDecayRate * tempFactor;
  let score = 100 - decayPercentage;
  
  // Also weight by the actual fractional time left to bestBeforeDate
  const timeRatioLeft = (exp - current) / totalShelfLifeMs;
  const timeRatioScore = timeRatioLeft * 100;
  
  // Combine both: take the minimum to be safe
  score = Math.min(score, timeRatioScore);
  
  return Math.max(0, Math.min(100, Math.round(score)));
};

// Haversine formula to compute distance in km
export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371; // Earth radius in km
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
  return Math.round(distance * 100) / 100; // round to 2 decimals
};
