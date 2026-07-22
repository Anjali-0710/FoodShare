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
  fontFamily: '"Plus Jakarta Sans", Inter, system-ui, -apple-system, sans-serif',
  borderRadius: 24,
  shadow: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 3,
  },
  btnShadow: {
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 3,
  },
  colors: {
    primary: '#22C55E',       // Primary Green: #22C55E
    background: '#F8FAFC',    // Background: #F8FAFC
    card: '#FFFFFF',          // Cards: #FFFFFF
    text: '#0F172A',          // Text Primary: #0F172A
    textSecondary: '#64748B',  // Text Secondary: #64748B
    border: '#E2E8F0',
    notification: '#F59E0B',  // Orange: #F59E0B
    accent: '#8B5CF6',        // Purple: #8B5CF6
    success: '#10B981',       // Emerald: #10B981
    warning: '#F59E0B',       // Orange: #F59E0B
    info: '#3B82F6',          // Blue: #3B82F6
    surface: '#F1F5F9',
    error: '#EF4444',
  }
};

export const darkTheme: AppTheme = {
  dark: true,
  fontFamily: '"Plus Jakarta Sans", Inter, system-ui, -apple-system, sans-serif',
  borderRadius: 24,
  shadow: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 3,
  },
  btnShadow: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 3,
  },
  colors: {
    primary: '#22C55E',       // Primary Green: #22C55E
    background: '#0F172A',    // Deep slate blue
    card: '#1E293B',          // Card elevation matching dark themes
    text: '#F8FAFC',          // Crisp light text
    textSecondary: '#94A3B8',  // Desaturated slate gray
    border: '#334155',
    notification: '#F59E0B',  // Orange
    accent: '#8B5CF6',        // Purple
    success: '#10B981',       // Emerald
    warning: '#F59E0B',       // Orange
    info: '#3B82F6',          // Blue
    surface: '#1E293B',
    error: '#EF4444',
  }
};
