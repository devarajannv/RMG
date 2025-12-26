import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

type Theme = 'light' | 'dark' | 'system';
type Language = 'en' | 'hi';
type DateFormat = 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';
type Currency = 'INR' | 'USD' | 'EUR' | 'GBP';

interface SettingsState {
  // Display settings
  theme: Theme;
  language: Language;
  dateFormat: DateFormat;
  currency: Currency;
  compactMode: boolean;
  
  // Notification preferences
  emailNotifications: boolean;
  benchAlerts: boolean;
  rolloffReminders: boolean;
  weeklyDigest: boolean;
  soundEnabled: boolean;
  
  // UI preferences
  sidebarCollapsed: boolean;
  defaultPage: string;
  itemsPerPage: number;
  
  // Actions
  setTheme: (theme: Theme) => void;
  setLanguage: (language: Language) => void;
  setDateFormat: (format: DateFormat) => void;
  setCurrency: (currency: Currency) => void;
  setCompactMode: (compact: boolean) => void;
  setEmailNotifications: (enabled: boolean) => void;
  setBenchAlerts: (enabled: boolean) => void;
  setRolloffReminders: (enabled: boolean) => void;
  setWeeklyDigest: (enabled: boolean) => void;
  setSoundEnabled: (enabled: boolean) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setDefaultPage: (page: string) => void;
  setItemsPerPage: (count: number) => void;
  resetToDefaults: () => void;
}

const defaultSettings = {
  theme: 'light' as Theme,
  language: 'en' as Language,
  dateFormat: 'DD/MM/YYYY' as DateFormat,
  currency: 'INR' as Currency,
  compactMode: false,
  emailNotifications: true,
  benchAlerts: true,
  rolloffReminders: true,
  weeklyDigest: false,
  soundEnabled: true,
  sidebarCollapsed: false,
  defaultPage: '/dashboard',
  itemsPerPage: 20,
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...defaultSettings,

      setTheme: (theme) => set({ theme }),
      setLanguage: (language) => set({ language }),
      setDateFormat: (dateFormat) => set({ dateFormat }),
      setCurrency: (currency) => set({ currency }),
      setCompactMode: (compactMode) => set({ compactMode }),
      setEmailNotifications: (emailNotifications) => set({ emailNotifications }),
      setBenchAlerts: (benchAlerts) => set({ benchAlerts }),
      setRolloffReminders: (rolloffReminders) => set({ rolloffReminders }),
      setWeeklyDigest: (weeklyDigest) => set({ weeklyDigest }),
      setSoundEnabled: (soundEnabled) => set({ soundEnabled }),
      setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
      setDefaultPage: (defaultPage) => set({ defaultPage }),
      setItemsPerPage: (itemsPerPage) => set({ itemsPerPage }),
      resetToDefaults: () => set(defaultSettings),
    }),
    {
      name: 'rmgaas-settings',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

// Helper hook for formatted dates based on user preference
export function useFormattedDate() {
  const dateFormat = useSettingsStore((state) => state.dateFormat);
  
  return (date: Date | string) => {
    const d = new Date(date);
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear();
    
    switch (dateFormat) {
      case 'MM/DD/YYYY':
        return `${month}/${day}/${year}`;
      case 'YYYY-MM-DD':
        return `${year}-${month}-${day}`;
      case 'DD/MM/YYYY':
      default:
        return `${day}/${month}/${year}`;
    }
  };
}
