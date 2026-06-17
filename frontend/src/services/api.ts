// Resolve API base URL dynamically for Web client; fallback to production URL for Mobile client.
const isWeb = typeof window !== 'undefined' && window.document;
const API_URL = isWeb 
  ? `${window.location.origin}/api`
  : 'https://foodshare-platform.onrender.com/api'; // Placeholder: Will be updated with user's specific Render URL


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
    const response = await fetch(`${API_URL}${endpoint}`, config);
    const data = await response.json();
    
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
