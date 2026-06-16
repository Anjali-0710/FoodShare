export interface FreshnessInput {
  foodType: string;
  preparationTime: Date;
  bestBeforeDate: Date;
  temperature: number;
}

export interface NgoRecommendationResult {
  ngoId: string;
  name: string;
  distanceKm: number;
  matchScore: number;
  capacityRemaining: number;
  preferences: string[];
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

export const recommendNgo = (
  donorLat: number,
  donorLon: number,
  donationFoodType: string,
  donationQuantity: number,
  ngos: Array<{
    id: string;
    name: string;
    lat: number;
    lon: number;
    capacity: number;
    preferences: string[];
  }>
): NgoRecommendationResult[] => {
  const recommendations = ngos.map((ngo) => {
    const distance = calculateDistance(donorLat, donorLon, ngo.lat, ngo.lon);
    
    // Compute Match Score (0 - 100)
    // 1. Distance score (max 40 pts): 40 pts if <= 2km, decreases linearly to 0 pts at 20km
    const distanceScore = Math.max(0, 40 * (1 - distance / 20));
    
    // 2. Preferences score (max 30 pts): 30 pts if NGO prefers this food type, 10 pts otherwise
    const prefersFood = ngo.preferences.includes(donationFoodType);
    const preferenceScore = prefersFood ? 30 : 10;
    
    // 3. Capacity score (max 30 pts): 30 pts if NGO has capacity >= quantity, 0 if capacity is 0, scaled in between
    let capacityScore = 0;
    if (ngo.capacity >= donationQuantity) {
      capacityScore = 30;
    } else if (ngo.capacity > 0) {
      capacityScore = 30 * (ngo.capacity / donationQuantity);
    }
    
    const matchScore = Math.round(distanceScore + preferenceScore + capacityScore);
    
    return {
      ngoId: ngo.id,
      name: ngo.name,
      distanceKm: distance,
      matchScore: Math.min(100, Math.max(10, matchScore)),
      capacityRemaining: ngo.capacity,
      preferences: ngo.preferences
    };
  });
  
  // Sort by matchScore desc, then distance asc
  return recommendations.sort((a, b) => b.matchScore - a.matchScore || a.distanceKm - b.distanceKm);
};

export interface DemandPredictionResult {
  category: string;
  predictedDemandKg: number;
  confidence: number;
}

export const predictDemand = (
  historicalDonations: Array<{
    foodType: string;
    quantity: number;
    unit: string;
    createdAt: Date;
  }>
): DemandPredictionResult[] => {
  const categories = ['Cooked Food', 'Vegetables', 'Fruits', 'Bakery Items', 'Beverages', 'Grocery Items'];
  const baseDemand: Record<string, number> = {
    'Cooked Food': 150,
    'Vegetables': 100,
    'Fruits': 80,
    'Bakery Items': 60,
    'Beverages': 50,
    'Grocery Items': 120
  };
  
  // Standardize quantity to Kg equivalents for uniform analysis
  const getKgEquivalent = (quantity: number, unit: string): number => {
    switch (unit) {
      case 'Kg': return quantity;
      case 'Liters': return quantity; // approx 1:1
      case 'Plates': return quantity * 0.4; // 0.4 kg per plate
      case 'Packets': return quantity * 0.3; // 0.3 kg per packet
      default: return quantity;
    }
  };

  const results: DemandPredictionResult[] = categories.map((cat) => {
    // Filter history for this category
    const catHistory = historicalDonations.filter((d) => d.foodType === cat);
    
    if (catHistory.length < 3) {
      // If we don't have enough historical data points, return base demand + small randomized growth
      const randomGrowth = Math.round((Math.random() * 20 - 5) * 10) / 10; // -5 to +15%
      const predictedDemandKg = Math.round(baseDemand[cat] * (1 + randomGrowth / 100));
      return {
        category: cat,
        predictedDemandKg,
        confidence: 60 // Lower confidence due to lack of historical data
      };
    }

    // Otherwise, do a linear trend prediction based on monthly grouped sums
    // Group historical logs into months
    const monthlySum: Record<string, number> = {};
    catHistory.forEach((item) => {
      const date = new Date(item.createdAt);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const qtyKg = getKgEquivalent(item.quantity, item.unit);
      monthlySum[key] = (monthlySum[key] || 0) + qtyKg;
    });

    const dataPoints = Object.values(monthlySum);
    
    // Simple linear regression: y = mx + c
    // We treat months as x values [1, 2, 3...]
    const n = dataPoints.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
    
    dataPoints.forEach((y, i) => {
      const x = i + 1;
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumXX += x * x;
    });
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX || 1);
    const intercept = (sumY - slope * sumX) / n;
    
    // Predict next month (x = n + 1)
    const nextX = n + 1;
    let predictedDemandKg = Math.round(slope * nextX + intercept);
    
    if (predictedDemandKg < 10) {
      predictedDemandKg = Math.round(baseDemand[cat] * 0.8); // floor protection
    }
    
    // Calculate R^2 correlation to represent confidence
    const meanY = sumY / n;
    let ssTot = 0, ssRes = 0;
    dataPoints.forEach((y, i) => {
      const x = i + 1;
      const fit = slope * x + intercept;
      ssTot += Math.pow(y - meanY, 2);
      ssRes += Math.pow(y - fit, 2);
    });
    
    let confidence = 85; // Default high confidence
    if (ssTot > 0) {
      const r2 = 1 - (ssRes / ssTot);
      confidence = Math.max(50, Math.min(95, Math.round(r2 * 100)));
    }

    return {
      category: cat,
      predictedDemandKg,
      confidence
    };
  });

  return results;
};
