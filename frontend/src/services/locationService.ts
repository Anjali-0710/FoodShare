import { apiCall } from './api';

export class LocationService {
  /**
   * Calculate distance between two coordinates using Haversine formula
   */
  static async calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
    token: string | null
  ) {
    return apiCall('/location/distance', {
      method: 'POST',
      body: { lat1, lon1, lat2, lon2 },
      token,
    });
  }

  /**
   * Validate coordinates range and service hub boundary proximity
   */
  static async validateCoordinates(latitude: number, longitude: number, token: string | null) {
    return apiCall('/location/validate', {
      method: 'POST',
      body: { latitude, longitude },
      token,
    });
  }

  /**
   * Compute multi-segment route ETA and details
   */
  static async getRouteDetails(
    volunteerLat: number,
    volunteerLon: number,
    donorLat: number,
    donorLon: number,
    ngoLat: number,
    ngoLon: number,
    token: string | null
  ) {
    return apiCall('/location/route-eta', {
      method: 'POST',
      body: {
        volunteerLat,
        volunteerLon,
        donorLat,
        donorLon,
        ngoLat,
        ngoLon,
      },
      token,
    });
  }
}

export default LocationService;
