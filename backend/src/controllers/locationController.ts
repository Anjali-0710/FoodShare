import { Request, Response } from 'express';

// Haversine distance formula utility
const getHaversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Earth's radius in kilometers
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
  return Math.round(distance * 100) / 100; // Round to 2 decimal places
};

// POST /api/location/distance
export const calculateDistance = async (req: Request, res: Response) => {
  const { lat1, lon1, lat2, lon2 } = req.body;

  if (
    lat1 === undefined ||
    lon1 === undefined ||
    lat2 === undefined ||
    lon2 === undefined
  ) {
    return res.status(400).json({ success: false, message: 'Please provide all lat1, lon1, lat2, lon2 coordinates' });
  }

  const nLat1 = Number(lat1);
  const nLon1 = Number(lon1);
  const nLat2 = Number(lat2);
  const nLon2 = Number(lon2);

  if (isNaN(nLat1) || isNaN(nLon1) || isNaN(nLat2) || isNaN(nLon2)) {
    return res.status(400).json({ success: false, message: 'Coordinates must be valid numbers' });
  }

  // Bounds check
  if (
    nLat1 < -90 || nLat1 > 90 ||
    nLat2 < -90 || nLat2 > 90 ||
    nLon1 < -180 || nLon1 > 180 ||
    nLon2 < -180 || nLon2 > 180
  ) {
    return res.status(400).json({ success: false, message: 'Coordinates are out of boundary ranges' });
  }

  try {
    const distance = getHaversineDistance(nLat1, nLon1, nLat2, nLon2);
    return res.status(200).json({ success: true, distance, unit: 'km' });
  } catch (error: any) {
    console.error('Calculate distance error:', error);
    return res.status(500).json({ success: false, message: 'Error calculating distance' });
  }
};

// POST /api/location/validate
export const validateLocation = async (req: Request, res: Response) => {
  const { latitude, longitude } = req.body;

  if (latitude === undefined || longitude === undefined) {
    return res.status(400).json({ success: false, message: 'Please provide both latitude and longitude' });
  }

  const lat = Number(latitude);
  const lon = Number(longitude);

  if (isNaN(lat) || isNaN(lon)) {
    return res.status(200).json({ success: true, valid: false, message: 'Coordinates are not valid numbers' });
  }

  if (lat < -90 || lat > 90) {
    return res.status(200).json({ success: true, valid: false, message: 'Latitude must be between -90 and 90 degrees' });
  }

  if (lon < -180 || lon > 180) {
    return res.status(200).json({ success: true, valid: false, message: 'Longitude must be between -180 and 180 degrees' });
  }

  // Proximity/radius validation: FoodShare operates within 100km of a central hub (e.g. Bangalore center 12.9716, 77.5946)
  const hubLat = 12.9716;
  const hubLon = 77.5946;
  const distanceFromHub = getHaversineDistance(lat, lon, hubLat, hubLon);

  if (distanceFromHub > 100) {
    return res.status(200).json({
      success: true,
      valid: false,
      distanceFromHub,
      message: `Location is too far (${distanceFromHub} km) from the primary Bangalore service hub. Must be within 100 km.`
    });
  }

  return res.status(200).json({
    success: true,
    valid: true,
    distanceFromHub,
    message: 'Location coordinates verified successfully and within service boundaries'
  });
};

// POST /api/location/route-eta
export const calculateRouteETA = async (req: Request, res: Response) => {
  const { volunteerLat, volunteerLon, donorLat, donorLon, ngoLat, ngoLon } = req.body;

  if (
    volunteerLat === undefined || volunteerLon === undefined ||
    donorLat === undefined || donorLon === undefined ||
    ngoLat === undefined || ngoLon === undefined
  ) {
    return res.status(400).json({ success: false, message: 'All volunteer, donor, and NGO coordinates are required' });
  }

  const vLat = Number(volunteerLat);
  const vLon = Number(volunteerLon);
  const dLat = Number(donorLat);
  const dLon = Number(donorLon);
  const nLat = Number(ngoLat);
  const nLon = Number(ngoLon);

  if (
    isNaN(vLat) || isNaN(vLon) ||
    isNaN(dLat) || isNaN(dLon) ||
    isNaN(nLat) || isNaN(nLon)
  ) {
    return res.status(400).json({ success: false, message: 'All coordinate inputs must be valid numbers' });
  }

  try {
    // Leg 1: Volunteer to Donor
    const leg1Distance = getHaversineDistance(vLat, vLon, dLat, dLon);
    // Leg 2: Donor to NGO
    const leg2Distance = getHaversineDistance(dLat, dLon, nLat, nLon);

    const totalDistance = Math.round((leg1Distance + leg2Distance) * 100) / 100;

    // Driving ETA calculation: average driving speed is 30 km/h (0.5 km/minute)
    // plus 4 minutes traffic overhead per leg
    const speedKmMin = 30 / 60; // 0.5 km/min
    const leg1Duration = Math.round(leg1Distance / speedKmMin + 4);
    const leg2Duration = Math.round(leg2Distance / speedKmMin + 4);
    const totalDuration = leg1Duration + leg2Duration;

    return res.status(200).json({
      success: true,
      route: {
        totalDistance,
        totalDuration,
        legs: [
          {
            name: 'Volunteer to Donor Pickup',
            distance: leg1Distance,
            duration: leg1Duration,
            startCoords: { latitude: vLat, longitude: vLon },
            endCoords: { latitude: dLat, longitude: dLon }
          },
          {
            name: 'Donor Pickup to NGO Dropoff',
            distance: leg2Distance,
            duration: leg2Duration,
            startCoords: { latitude: dLat, longitude: dLon },
            endCoords: { latitude: nLat, longitude: nLon }
          }
        ]
      }
    });
  } catch (error: any) {
    console.error('Route ETA calculation error:', error);
    return res.status(500).json({ success: false, message: 'Error calculating route ETA' });
  }
};
