/**
 * Onboarding Store
 * 
 * Zustand store for managing onboarding wizard state.
 * Handles navigation, step completion, and UI state.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface OnboardingWizardState {
  // Current position
  currentPhase: number;
  currentStep: number;
  
  // Expanded sections (for accordion-style UI)
  expandedSections: Record<string, boolean>;
  
  // UI state
  isInitializing: boolean;
  showSkipConfirmation: boolean;
  pendingSkipStep: { phase: number; stepCode: string } | null;
  
  // Dirty state tracking
  hasUnsavedChanges: boolean;
  
  // Actions
  setCurrentPhase: (phase: number) => void;
  setCurrentStep: (step: number) => void;
  goToPhase: (phase: number) => void;
  nextPhase: () => void;
  prevPhase: () => void;
  nextStep: () => void;
  prevStep: () => void;
  
  toggleSection: (sectionId: string) => void;
  expandSection: (sectionId: string) => void;
  collapseSection: (sectionId: string) => void;
  
  setIsInitializing: (value: boolean) => void;
  setShowSkipConfirmation: (show: boolean) => void;
  setPendingSkipStep: (step: { phase: number; stepCode: string } | null) => void;
  
  setHasUnsavedChanges: (value: boolean) => void;
  
  // Reset
  resetWizardState: () => void;
}

const initialState = {
  currentPhase: 1,
  currentStep: 0,
  expandedSections: {},
  isInitializing: false,
  showSkipConfirmation: false,
  pendingSkipStep: null,
  hasUnsavedChanges: false,
};

export const useOnboardingStore = create<OnboardingWizardState>()(
  persist(
    (set) => ({
      ...initialState,

      setCurrentPhase: (phase) => set({ currentPhase: phase, currentStep: 0 }),
      
      setCurrentStep: (step) => set({ currentStep: step }),
      
      goToPhase: (phase) => set({ currentPhase: phase, currentStep: 0 }),
      
      nextPhase: () => set((state) => ({ 
        currentPhase: Math.min(state.currentPhase + 1, 5),
        currentStep: 0,
      })),
      
      prevPhase: () => set((state) => ({ 
        currentPhase: Math.max(state.currentPhase - 1, 1),
        currentStep: 0,
      })),
      
      nextStep: () => set((state) => ({ 
        currentStep: state.currentStep + 1,
      })),
      
      prevStep: () => set((state) => ({ 
        currentStep: Math.max(state.currentStep - 1, 0),
      })),

      toggleSection: (sectionId) => set((state) => ({
        expandedSections: {
          ...state.expandedSections,
          [sectionId]: !state.expandedSections[sectionId],
        },
      })),
      
      expandSection: (sectionId) => set((state) => ({
        expandedSections: {
          ...state.expandedSections,
          [sectionId]: true,
        },
      })),
      
      collapseSection: (sectionId) => set((state) => ({
        expandedSections: {
          ...state.expandedSections,
          [sectionId]: false,
        },
      })),

      setIsInitializing: (value) => set({ isInitializing: value }),
      
      setShowSkipConfirmation: (show) => set({ showSkipConfirmation: show }),
      
      setPendingSkipStep: (step) => set({ pendingSkipStep: step }),
      
      setHasUnsavedChanges: (value) => set({ hasUnsavedChanges: value }),

      resetWizardState: () => set(initialState),
    }),
    {
      name: 'rmgaas-onboarding',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        currentPhase: state.currentPhase,
        currentStep: state.currentStep,
        expandedSections: state.expandedSections,
      }),
    }
  )
);

// Selector hooks for common patterns
export const useCurrentPhase = () => useOnboardingStore((state) => state.currentPhase);
export const useCurrentStep = () => useOnboardingStore((state) => state.currentStep);
export const useExpandedSections = () => useOnboardingStore((state) => state.expandedSections);
