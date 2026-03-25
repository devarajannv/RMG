/**
 * AI Assist Store
 * Controls AI Assist feature enable/disable state.
 * Persisted to localStorage so preference survives page reloads.
 *
 * Architecture: Writer + Scribe model
 * - When AI Assist is OFF, all Writer features work normally
 * - When AI Assist is ON, AI-enhanced features are visible
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface AiAssistState {
  /** Whether AI Assist features are enabled */
  isAiAssistEnabled: boolean;

  // Actions
  enableAiAssist: () => void;
  disableAiAssist: () => void;
  toggleAiAssist: () => void;
}

export const useAiAssistStore = create<AiAssistState>()(
  persist(
    (set) => ({
      isAiAssistEnabled: true, // Default ON — AI features available by default

      enableAiAssist: () => set({ isAiAssistEnabled: true }),
      disableAiAssist: () => set({ isAiAssistEnabled: false }),
      toggleAiAssist: () => set((state) => ({ isAiAssistEnabled: !state.isAiAssistEnabled })),
    }),
    {
      name: 'rmgaas-ai-assist-preferences',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
