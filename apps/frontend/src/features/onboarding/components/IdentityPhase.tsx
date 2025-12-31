/**
 * Phase 1: Organization Identity
 * 
 * Collects core organization information:
 * - Basic info (name, industry, size)
 * - Branding (logo, colors)
 * - Regional settings (currency, timezone, locale)
 */

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Building2, Palette, Globe, Check, ChevronDown, ChevronRight, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  useTenantProfile,
  useUpdateTenantProfile,
  useUpdateBranding,
  useUpdateRegional,
  useIndustries,
  useCompleteStep,
} from '../api';
import { useOnboardingStore } from '../store';
import type { TenantProfileInput, BrandingInput, RegionalInput } from '../types';

// ============================================================================
// Constants
// ============================================================================

const COMPANY_SIZES = [
  { value: '1-10', label: '1-10 employees' },
  { value: '11-50', label: '11-50 employees' },
  { value: '51-200', label: '51-200 employees' },
  { value: '201-500', label: '201-500 employees' },
  { value: '501-1000', label: '501-1000 employees' },
  { value: '1001-5000', label: '1001-5000 employees' },
  { value: '5001+', label: '5000+ employees' },
];

const CURRENCIES = [
  { value: 'INR', label: 'Indian Rupee (₹)' },
  { value: 'USD', label: 'US Dollar ($)' },
  { value: 'EUR', label: 'Euro (€)' },
  { value: 'GBP', label: 'British Pound (£)' },
  { value: 'AUD', label: 'Australian Dollar (A$)' },
  { value: 'CAD', label: 'Canadian Dollar (C$)' },
  { value: 'SGD', label: 'Singapore Dollar (S$)' },
  { value: 'AED', label: 'UAE Dirham (د.إ)' },
];

const TIMEZONES = [
  { value: 'Asia/Kolkata', label: 'India Standard Time (IST)' },
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'Europe/London', label: 'British Time (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Central European Time (CET)' },
  { value: 'Asia/Singapore', label: 'Singapore Time (SGT)' },
  { value: 'Asia/Dubai', label: 'Gulf Standard Time (GST)' },
  { value: 'Australia/Sydney', label: 'Australian Eastern Time (AET)' },
];

const DATE_FORMATS = [
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY (31/12/2025)' },
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY (12/31/2025)' },
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD (2025-12-31)' },
];

const FISCAL_YEAR_MONTHS = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
];

// ============================================================================
// Sub-components
// ============================================================================

interface CollapsibleSectionProps {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  isComplete?: boolean;
  children: React.ReactNode;
}

function CollapsibleSection({ 
  id, 
  title, 
  description, 
  icon: Icon, 
  isComplete,
  children 
}: CollapsibleSectionProps) {
  const { expandedSections, toggleSection } = useOnboardingStore();
  const isExpanded = expandedSections[id] ?? true;

  return (
    <Card className={cn(
      'transition-all duration-200',
      isComplete && 'border-green-200 bg-green-50/30'
    )}>
      <CardHeader 
        className="cursor-pointer select-none"
        onClick={() => toggleSection(id)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              'flex h-10 w-10 items-center justify-center rounded-lg',
              isComplete 
                ? 'bg-green-100 text-green-600' 
                : 'bg-primary/10 text-primary'
            )}>
              {isComplete ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
            </div>
            <div>
              <CardTitle className="text-lg">{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="shrink-0">
            {isExpanded ? (
              <ChevronDown className="h-5 w-5" />
            ) : (
              <ChevronRight className="h-5 w-5" />
            )}
          </Button>
        </div>
      </CardHeader>
      {isExpanded && (
        <CardContent className="pt-0">
          {children}
        </CardContent>
      )}
    </Card>
  );
}

// ============================================================================
// Basic Info Form
// ============================================================================

interface BasicInfoFormProps {
  onComplete: () => void;
}

function BasicInfoForm({ onComplete }: BasicInfoFormProps) {
  const { data: profileResponse, isLoading: profileLoading } = useTenantProfile();
  const { data: industriesResponse, isLoading: industriesLoading } = useIndustries();
  const updateProfile = useUpdateTenantProfile();
  
  // Extract data from API response wrapper
  const profile = profileResponse?.data;
  const industries = industriesResponse?.data || [];

  const { register, handleSubmit, setValue, watch, formState: { errors, isDirty } } = useForm<TenantProfileInput>({
    defaultValues: {
      organizationName: '',
      industryId: '',
      subIndustry: '',
      companySize: '',
      headquarters: '',
      website: '',
      description: '',
    },
  });

  // Populate form when data loads
  useEffect(() => {
    if (profile) {
      setValue('organizationName', profile.organizationName || '');
      setValue('industryId', profile.industryId || '');
      setValue('subIndustry', profile.subIndustry || '');
      setValue('companySize', profile.companySize || '');
      setValue('headquarters', profile.headquarters || '');
      setValue('website', profile.website || '');
      setValue('description', profile.description || '');
    }
  }, [profile, setValue]);

  const selectedIndustryId = watch('industryId');

  const onSubmit = async (data: TenantProfileInput) => {
    await updateProfile.mutateAsync(data);
    onComplete();
  };

  if (profileLoading || industriesLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        {/* Organization Name */}
        <div className="space-y-2">
          <Label htmlFor="organizationName">
            Organization Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="organizationName"
            placeholder="Acme Corporation"
            {...register('organizationName', { required: 'Organization name is required' })}
          />
          {errors.organizationName && (
            <p className="text-sm text-destructive">{errors.organizationName.message}</p>
          )}
        </div>

        {/* Industry */}
        <div className="space-y-2">
          <Label htmlFor="industryId">Industry</Label>
          <Select
            value={selectedIndustryId}
            onValueChange={(value) => setValue('industryId', value, { shouldDirty: true })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select industry" />
            </SelectTrigger>
            <SelectContent>
              {industries?.map((industry) => (
                <SelectItem key={industry.id} value={industry.id}>
                  {industry.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Sub-industry */}
        <div className="space-y-2">
          <Label htmlFor="subIndustry">Sub-industry / Specialization</Label>
          <Input
            id="subIndustry"
            placeholder="e.g., Cloud Services, FinTech"
            {...register('subIndustry')}
          />
        </div>

        {/* Company Size */}
        <div className="space-y-2">
          <Label htmlFor="companySize">Company Size</Label>
          <Select
            value={watch('companySize') || ''}
            onValueChange={(value) => setValue('companySize', value, { shouldDirty: true })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select size" />
            </SelectTrigger>
            <SelectContent>
              {COMPANY_SIZES.map((size) => (
                <SelectItem key={size.value} value={size.value}>
                  {size.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Headquarters */}
        <div className="space-y-2">
          <Label htmlFor="headquarters">Headquarters Location</Label>
          <Input
            id="headquarters"
            placeholder="e.g., Bangalore, India"
            {...register('headquarters')}
          />
        </div>

        {/* Website */}
        <div className="space-y-2">
          <Label htmlFor="website">Website</Label>
          <Input
            id="website"
            type="url"
            placeholder="https://www.example.com"
            {...register('website', {
              pattern: {
                value: /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/,
                message: 'Please enter a valid URL',
              },
            })}
          />
          {errors.website && (
            <p className="text-sm text-destructive">{errors.website.message}</p>
          )}
        </div>
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">About the Organization</Label>
        <Textarea
          id="description"
          placeholder="Brief description of your organization..."
          rows={3}
          {...register('description')}
        />
      </div>

      {/* Submit */}
      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={updateProfile.isPending || !isDirty}
        >
          {updateProfile.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            'Save & Continue'
          )}
        </Button>
      </div>
    </form>
  );
}

// ============================================================================
// Branding Form
// ============================================================================

interface BrandingFormProps {
  onComplete: () => void;
}

function BrandingForm({ onComplete }: BrandingFormProps) {
  const { data: profileResponse, isLoading } = useTenantProfile();
  const profile = profileResponse?.data;
  const updateBranding = useUpdateBranding();
  const [formData, setFormData] = useState<BrandingInput>({
    primaryColor: '#3B82F6',
    secondaryColor: '#1E40AF',
    accentColor: '#10B981',
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        primaryLogo: profile.primaryLogo || undefined,
        secondaryLogo: profile.secondaryLogo || undefined,
        favicon: profile.favicon || undefined,
        primaryColor: profile.primaryColor || '#3B82F6',
        secondaryColor: profile.secondaryColor || '#1E40AF',
        accentColor: profile.accentColor || '#10B981',
      });
    }
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateBranding.mutateAsync(formData);
    onComplete();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Color Pickers */}
      <div className="grid gap-6 md:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="primaryColor">Primary Color</Label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              id="primaryColor"
              value={formData.primaryColor || '#3B82F6'}
              onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
              className="h-10 w-16 cursor-pointer rounded border"
            />
            <Input
              value={formData.primaryColor || ''}
              onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
              placeholder="#3B82F6"
              className="flex-1"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="secondaryColor">Secondary Color</Label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              id="secondaryColor"
              value={formData.secondaryColor || '#1E40AF'}
              onChange={(e) => setFormData({ ...formData, secondaryColor: e.target.value })}
              className="h-10 w-16 cursor-pointer rounded border"
            />
            <Input
              value={formData.secondaryColor || ''}
              onChange={(e) => setFormData({ ...formData, secondaryColor: e.target.value })}
              placeholder="#1E40AF"
              className="flex-1"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="accentColor">Accent Color</Label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              id="accentColor"
              value={formData.accentColor || '#10B981'}
              onChange={(e) => setFormData({ ...formData, accentColor: e.target.value })}
              className="h-10 w-16 cursor-pointer rounded border"
            />
            <Input
              value={formData.accentColor || ''}
              onChange={(e) => setFormData({ ...formData, accentColor: e.target.value })}
              placeholder="#10B981"
              className="flex-1"
            />
          </div>
        </div>
      </div>

      {/* Preview */}
      <div className="rounded-lg border p-4">
        <p className="mb-3 text-sm font-medium text-muted-foreground">Preview</p>
        <div className="flex items-center gap-4">
          <div
            className="h-12 w-24 rounded"
            style={{ backgroundColor: formData.primaryColor }}
          />
          <div
            className="h-12 w-24 rounded"
            style={{ backgroundColor: formData.secondaryColor }}
          />
          <div
            className="h-12 w-24 rounded"
            style={{ backgroundColor: formData.accentColor }}
          />
        </div>
      </div>

      {/* Logo URLs (simplified - in production would be file upload) */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="primaryLogo">Primary Logo URL</Label>
          <Input
            id="primaryLogo"
            type="url"
            placeholder="https://example.com/logo.png"
            value={formData.primaryLogo || ''}
            onChange={(e) => setFormData({ ...formData, primaryLogo: e.target.value })}
          />
          <p className="text-xs text-muted-foreground">
            Recommended: SVG or PNG with transparent background
          </p>
        </div>
      </div>

      {/* Submit */}
      <div className="flex justify-end">
        <Button type="submit" disabled={updateBranding.isPending}>
          {updateBranding.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            'Save & Continue'
          )}
        </Button>
      </div>
    </form>
  );
}

// ============================================================================
// Regional Settings Form
// ============================================================================

interface RegionalFormProps {
  onComplete: () => void;
}

function RegionalForm({ onComplete }: RegionalFormProps) {
  const { data: profileResponse, isLoading } = useTenantProfile();
  const profile = profileResponse?.data;
  const updateRegional = useUpdateRegional();
  const [formData, setFormData] = useState<RegionalInput>({
    defaultCurrency: 'INR',
    defaultTimezone: 'Asia/Kolkata',
    defaultLanguage: 'en',
    dateFormat: 'DD/MM/YYYY',
    fiscalYearStart: 4,
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        defaultCurrency: profile.defaultCurrency || 'INR',
        defaultTimezone: profile.defaultTimezone || 'Asia/Kolkata',
        defaultLanguage: profile.defaultLanguage || 'en',
        dateFormat: profile.dateFormat || 'DD/MM/YYYY',
        fiscalYearStart: profile.fiscalYearStart || 4,
      });
    }
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateRegional.mutateAsync(formData);
    onComplete();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        {/* Currency */}
        <div className="space-y-2">
          <Label>Default Currency</Label>
          <Select
            value={formData.defaultCurrency || 'INR'}
            onValueChange={(value) => setFormData({ ...formData, defaultCurrency: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CURRENCIES.map((currency) => (
                <SelectItem key={currency.value} value={currency.value}>
                  {currency.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Timezone */}
        <div className="space-y-2">
          <Label>Default Timezone</Label>
          <Select
            value={formData.defaultTimezone || 'Asia/Kolkata'}
            onValueChange={(value) => setFormData({ ...formData, defaultTimezone: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIMEZONES.map((tz) => (
                <SelectItem key={tz.value} value={tz.value}>
                  {tz.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Date Format */}
        <div className="space-y-2">
          <Label>Date Format</Label>
          <Select
            value={formData.dateFormat || 'DD/MM/YYYY'}
            onValueChange={(value) => setFormData({ ...formData, dateFormat: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DATE_FORMATS.map((format) => (
                <SelectItem key={format.value} value={format.value}>
                  {format.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Fiscal Year Start */}
        <div className="space-y-2">
          <Label>Fiscal Year Starts</Label>
          <Select
            value={String(formData.fiscalYearStart || 4)}
            onValueChange={(value) => setFormData({ ...formData, fiscalYearStart: parseInt(value) })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FISCAL_YEAR_MONTHS.map((month) => (
                <SelectItem key={month.value} value={String(month.value)}>
                  {month.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            First month of your financial year
          </p>
        </div>
      </div>

      {/* Submit */}
      <div className="flex justify-end">
        <Button type="submit" disabled={updateRegional.isPending}>
          {updateRegional.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            'Save & Continue'
          )}
        </Button>
      </div>
    </form>
  );
}

// ============================================================================
// Main Component
// ============================================================================

interface IdentityPhaseProps {
  onPhaseComplete: () => void;
}

export function IdentityPhase({ onPhaseComplete }: IdentityPhaseProps) {
  const completeStep = useCompleteStep();
  const [completedSections, setCompletedSections] = useState<Record<string, boolean>>({});

  const handleBasicInfoComplete = async () => {
    await completeStep.mutateAsync({ phase: 1, stepCode: 'basic-info' });
    setCompletedSections(prev => ({ ...prev, basic: true }));
  };

  const handleBrandingComplete = async () => {
    await completeStep.mutateAsync({ phase: 1, stepCode: 'branding' });
    setCompletedSections(prev => ({ ...prev, branding: true }));
  };

  const handleRegionalComplete = async () => {
    await completeStep.mutateAsync({ phase: 1, stepCode: 'regional' });
    setCompletedSections(prev => ({ ...prev, regional: true }));
    // All sections complete - advance to next phase
    onPhaseComplete();
  };

  return (
    <div className="space-y-6">
      {/* Phase Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Organization Identity</h2>
        <p className="text-muted-foreground">
          Tell us about your organization. This information will be used throughout the platform.
        </p>
      </div>

      {/* Sections */}
      <div className="space-y-4">
        <CollapsibleSection
          id="identity-basic"
          title="Basic Information"
          description="Organization name, industry, and key details"
          icon={Building2}
          isComplete={completedSections.basic}
        >
          <BasicInfoForm onComplete={handleBasicInfoComplete} />
        </CollapsibleSection>

        <CollapsibleSection
          id="identity-branding"
          title="Branding"
          description="Logo and color scheme for your workspace"
          icon={Palette}
          isComplete={completedSections.branding}
        >
          <BrandingForm onComplete={handleBrandingComplete} />
        </CollapsibleSection>

        <CollapsibleSection
          id="identity-regional"
          title="Regional Settings"
          description="Currency, timezone, and date formats"
          icon={Globe}
          isComplete={completedSections.regional}
        >
          <RegionalForm onComplete={handleRegionalComplete} />
        </CollapsibleSection>
      </div>
    </div>
  );
}
