// Environment configuration for frontend
// Values are injected at build time by Vite

export const config = {
  // Environment mode
  mode: import.meta.env.MODE as 'development' | 'production' | 'test',
  isDev: import.meta.env.DEV,
  isProd: import.meta.env.PROD,
  
  // API configuration
  apiUrl: import.meta.env.VITE_API_URL || '/api',
  
  // App info
  appName: 'RMGaaS',
  appVersion: '1.0.0',
  
  // Feature flags
  features: {
    debugMode: import.meta.env.DEV,
    mockData: false,
  },
};

// Environment badge info
export function getEnvironmentBadge(): { label: string; color: string } | null {
  if (config.isProd) {
    return null; // Don't show badge in production
  }
  
  if (config.isDev) {
    return { label: 'DEV', color: 'bg-amber-500' };
  }
  
  if (config.mode === 'test') {
    return { label: 'TEST', color: 'bg-purple-500' };
  }
  
  return { label: config.mode.toUpperCase(), color: 'bg-gray-500' };
}

