/**
 * Onboarding Wizard
 * 
 * Main orchestrating component for the 5-phase organization onboarding.
 * Features:
 * - Progress stepper showing all phases
 * - Phase navigation
 * - Overall progress indicator
 */

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Building2,
  FolderTree,
  Briefcase,
  Users,
  Shield,
  CheckCircle2,
  // Circle - reserved for step indicators
  Loader2,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { useOnboardingProgress, useOnboardingSummary } from '../api';
import { useOnboardingStore } from '../store';
import { IdentityPhase } from './IdentityPhase';
import { StructurePhase } from './StructurePhase';
import { RolesPhase } from './RolesPhase';
import { PeoplePhase } from './PeoplePhase';
import { GovernancePhase } from './GovernancePhase';

// ============================================================================
// Phase Configuration
// ============================================================================

const PHASES = [
  {
    id: 1,
    name: 'Identity',
    description: 'Organization profile',
    icon: Building2,
  },
  {
    id: 2,
    name: 'Structure',
    description: 'Departments & teams',
    icon: FolderTree,
  },
  {
    id: 3,
    name: 'Roles',
    description: 'Jobs & grade bands',
    icon: Briefcase,
  },
  {
    id: 4,
    name: 'People',
    description: 'Resources & users',
    icon: Users,
  },
  {
    id: 5,
    name: 'Governance',
    description: 'Delegation rules',
    icon: Shield,
  },
];

// ============================================================================
// Progress Stepper
// ============================================================================

interface ProgressStepperProps {
  currentPhase: number;
  completedPhases: Set<number>;
  onPhaseClick: (phase: number) => void;
}

function ProgressStepper({ currentPhase, completedPhases, onPhaseClick }: ProgressStepperProps) {
  return (
    <div className="relative">
      {/* Connection line */}
      <div className="absolute left-0 right-0 top-5 h-0.5 bg-border">
        <div 
          className="h-full bg-primary transition-all duration-500"
          style={{ width: `${((currentPhase - 1) / (PHASES.length - 1)) * 100}%` }}
        />
      </div>

      {/* Steps */}
      <div className="relative flex justify-between">
        {PHASES.map((phase) => {
          const isCompleted = completedPhases.has(phase.id);
          const isCurrent = phase.id === currentPhase;
          const isPast = phase.id < currentPhase;
          const Icon = phase.icon;

          return (
            <button
              key={phase.id}
              onClick={() => onPhaseClick(phase.id)}
              disabled={phase.id > currentPhase && !isCompleted}
              className={cn(
                'group flex flex-col items-center',
                phase.id > currentPhase && !isCompleted && 'cursor-not-allowed opacity-50'
              )}
            >
              {/* Icon circle */}
              <div
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-300',
                  isCompleted && 'border-green-500 bg-green-500 text-white',
                  isCurrent && !isCompleted && 'border-primary bg-primary text-primary-foreground',
                  isPast && !isCompleted && 'border-primary bg-primary/20 text-primary',
                  !isCurrent && !isPast && !isCompleted && 'border-border bg-background text-muted-foreground'
                )}
              >
                {isCompleted ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : (
                  <Icon className="h-5 w-5" />
                )}
              </div>

              {/* Label */}
              <div className="mt-2 text-center">
                <div
                  className={cn(
                    'text-sm font-medium',
                    (isCurrent || isCompleted) && 'text-foreground',
                    !isCurrent && !isCompleted && 'text-muted-foreground'
                  )}
                >
                  {phase.name}
                </div>
                <div className="text-xs text-muted-foreground hidden sm:block">
                  {phase.description}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// Phase Content Renderer
// ============================================================================

interface PhaseContentProps {
  phase: number;
  onPhaseComplete: () => void;
}

function PhaseContent({ phase, onPhaseComplete }: PhaseContentProps) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={phase}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.2 }}
      >
        {phase === 1 && <IdentityPhase onPhaseComplete={onPhaseComplete} />}
        {phase === 2 && <StructurePhase onPhaseComplete={onPhaseComplete} />}
        {phase === 3 && <RolesPhase onPhaseComplete={onPhaseComplete} />}
        {phase === 4 && <PeoplePhase onPhaseComplete={onPhaseComplete} />}
        {phase === 5 && <GovernancePhase onPhaseComplete={onPhaseComplete} />}
      </motion.div>
    </AnimatePresence>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function OnboardingWizard() {
  const navigate = useNavigate();
  const { data: progressResponse, isLoading: progressLoading } = useOnboardingProgress();
  const { data: summaryResponse, isLoading: summaryLoading } = useOnboardingSummary();
  
  // Extract data from API response wrapper
  const progress = progressResponse?.data;
  const summary = summaryResponse?.data;
  
  const { 
    currentPhase, 
    setCurrentPhase, 
    nextPhase,
    prevPhase,
  } = useOnboardingStore();

  // Sync with server state on load
  useEffect(() => {
    if (progress?.currentPhase && progress.currentPhase !== currentPhase) {
      setCurrentPhase(progress.currentPhase);
    }
  }, [progress?.currentPhase, currentPhase, setCurrentPhase]);

  // Redirect if onboarding is complete
  useEffect(() => {
    if (progress?.isComplete || summary?.status === 'COMPLETED') {
      navigate('/', { replace: true });
    }
  }, [progress?.isComplete, summary?.status, navigate]);

  const handlePhaseComplete = () => {
    if (currentPhase < 5) {
      nextPhase();
    } else {
      // Onboarding complete - redirect to dashboard
      navigate('/', { replace: true });
    }
  };

  const handlePhaseClick = (phase: number) => {
    setCurrentPhase(phase);
  };

  // Get completed phases from progress data
  const completedPhases = new Set<number>();
  if (progress?.phases) {
    progress.phases.forEach((p) => {
      if (p.isComplete) {
        completedPhases.add(p.phase);
      }
    });
  }

  if (progressLoading || summaryLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="mt-4 text-muted-foreground">Loading onboarding...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
              R
            </div>
            <span className="font-semibold">Organization Setup</span>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Overall progress */}
            <div className="hidden sm:flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Progress</span>
              <Progress 
                value={summary?.progressPercentage || 0} 
                className="w-24 h-2"
              />
              <span className="text-sm font-medium">
                {summary?.progressPercentage || 0}%
              </span>
            </div>
            
            <Button variant="ghost" size="icon">
              <HelpCircle className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="container px-4 py-8">
        {/* Progress Stepper */}
        <div className="mb-12 px-4">
          <ProgressStepper
            currentPhase={currentPhase}
            completedPhases={completedPhases}
            onPhaseClick={handlePhaseClick}
          />
        </div>

        {/* Phase Content */}
        <div className="max-w-4xl mx-auto">
          <PhaseContent 
            phase={currentPhase} 
            onPhaseComplete={handlePhaseComplete}
          />
        </div>

        {/* Navigation Footer */}
        <div className="max-w-4xl mx-auto mt-8 flex items-center justify-between border-t pt-6">
          <Button
            variant="outline"
            onClick={prevPhase}
            disabled={currentPhase === 1}
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            Previous
          </Button>

          <div className="text-sm text-muted-foreground">
            Phase {currentPhase} of {PHASES.length}
          </div>

          <Button
            onClick={nextPhase}
            disabled={currentPhase === 5}
          >
            Next
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </main>
    </div>
  );
}
