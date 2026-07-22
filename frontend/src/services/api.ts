import Constants from 'expo-constants';

// Resolve API base URL dynamically for Web client; fallback to production URL for Mobile client.
const isWeb = typeof window !== 'undefined' && window.document;
const getApiUrl = () => {
  if (isWeb) {
    const { hostname, port, origin } = window.location;
    // If running in development web port (e.g. on port 8081), redirect API calls to local backend port 5000
    if ((hostname === 'localhost' || hostname === '127.0.0.1') && port !== '5000') {
      return 'http://localhost:5000/api';
    }
    return `${origin}/api`;
  }
  
  // Mobile client resolution
  // Check if running on physical device via Expo packager IP (e.g., 192.168.x.x)
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const ip = hostUri.split(':')[0];
    return `http://${ip}:5000/api`;
  }
  
  // Default to emulator localhost loopback if no debugger host is detected
  return 'http://10.0.2.2:5000/api';
};
const API_URL = getApiUrl();


interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: any;
  token?: string | null;
}

export const apiCall = async (endpoint: string, options: RequestOptions = {}) => {
  const { method = 'GET', body, token } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config: RequestInit = {
    method,
    headers,
  };

  if (body) {
    config.body = JSON.stringify(body);
  }

  try {
    const targetUrl = `${API_URL}${endpoint}`;
    console.log(`[API Request Log] Method: ${method} | URL: ${targetUrl}`);
    
    const response = await fetch(targetUrl, config);
    
    // Safely parse the response body as text first, then try to parse as JSON
    const textResponse = await response.text();
    console.log(`[API Response Log] URL: ${targetUrl} | HTTP Status: ${response.status} | Body: ${textResponse}`);
    
    let data: any = {};
    try {
      data = JSON.parse(textResponse);
    } catch (parseError) {
      // If parsing fails (e.g. HTML was returned), fall back safely to text summary
      data = {
        success: false,
        message: textResponse.substring(0, 200) || `Server returned response code ${response.status}`
      };
    }
    
    if (!response.ok) {
      const err = new Error(data.message || 'Something went wrong');
      (err as any).status = response.status;
      (err as any).data = data;
      throw err;
    }
    
    return data;
  } catch (error: any) {
    console.error(`API Call failed to: ${endpoint}`, error.message);
    throw error;
  }
};
