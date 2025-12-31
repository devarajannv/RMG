/**
 * Onboarding Page
 * 
 * Entry point for new tenant organization setup.
 * Renders the OnboardingWizard component within the main layout.
 */

import { OnboardingWizard } from '@/features/onboarding';
import MainLayout from '@/components/layout/MainLayout';

export default function OnboardingPage() {
  return (
    <MainLayout>
      <OnboardingWizard />
    </MainLayout>
  );
}
