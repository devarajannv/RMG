/**
 * Onboarding Page
 * 
 * Entry point for new tenant organization setup.
 * Renders the OnboardingWizard component within the main layout.
 */

import { OnboardingWizard } from '@/features/onboarding';

export default function OnboardingPage() {
  return (
      <OnboardingWizard />
  );
}
