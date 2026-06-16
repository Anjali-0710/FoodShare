export interface AppTheme {
  dark: boolean;
  fontFamily: string;
  borderRadius: number;
  shadow: {
    shadowColor: string;
    shadowOffset: { width: number; height: number };
    shadowOpacity: number;
    shadowRadius: number;
    elevation: number;
  };
  btnShadow: {
    shadowColor: string;
    shadowOffset: { width: number; height: number };
    shadowOpacity: number;
    shadowRadius: number;
    elevation: number;
  };
  colors: {
    primary: string;
    background: string;
    card: string;
    text: string;
    textSecondary: string;
    border: string;
    notification: string;
    accent: string;
    success: string;
    warning: string;
    info: string;
    surface: string;
    error: string;
  };
}

export const lightTheme: AppTheme = {
  dark: false,
  fontFamily: 'Outfit, system-ui, -apple-system, sans-serif',
  borderRadius: 16,
  shadow: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  btnShadow: {
    shadowColor: '#2E7D32',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  colors: {
    primary: '#2E7D32',       // Classic Forest Green
    background: '#F8F9FA',    // Clean soft background
    card: '#FFFFFF',          // Elevating cards in pure white
    text: '#1E293B',          // Premium dark blue-gray text
    textSecondary: '#64748B',  // Slate gray
    border: '#E2E8F0',
    notification: '#E65100',  // Warm orange notifications
    accent: '#EF6C00',        // Deep Orange accent
    success: '#2E7D32',
    warning: '#F59E0B',
    info: '#3B82F6',
    surface: '#F1F5F9',
    error: '#DC2626',
  }
};

export const darkTheme: AppTheme = {
  dark: true,
  fontFamily: 'Outfit, system-ui, -apple-system, sans-serif',
  borderRadius: 16,
  shadow: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 2,
  },
  btnShadow: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  colors: {
    primary: '#4CAF50',       // Accessible lighter green
    background: '#0F172A',    // Deep slate blue
    card: '#1E293B',          // Card elevation matching dark themes
    text: '#F8FAFC',          // Crisp light text
    textSecondary: '#94A3B8',  // Desaturated slate gray
    border: '#334155',
    notification: '#FF9800',
    accent: '#FF9800',        // Vibrant orange accent
    success: '#4CAF50',
    warning: '#FBBF24',
    info: '#60A5FA',
    surface: '#1E293B',
    error: '#EF4444',
  }
};

