/**
 * ContractRenewalDialog Component
 * 
 * Advanced renewal workflow for contracts:
 * - Renewal configuration
 * - Terms modification
 * - Value adjustment
 * - Auto-renewal settings
 * - Approval routing (optional)
 * - Amendment tracking
 * 
 * @module ContractRenewalDialog
 */

import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  RefreshCw,
  Calendar,
  FileText,
  CheckCircle2,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
} from '@/components/ui/dialog';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

interface Contract {
  id: string;
  name: string;
  contractNumber: string;
  status: string;
  startDate: string;
  endDate?: string;
  value?: number;
  currency: string;
  billingType: string;
  autoRenew: boolean;
  paymentTerms?: string;
}

interface RenewalOptions {
  renewalType: 'EXTEND' | 'NEW_TERM' | 'AMENDMENT';
  newEndDate: string;
  newValue?: number;
  valueChangePercent?: number;
  newPaymentTerms?: string;
  notes?: string;
  autoRenew?: boolean;
  requiresApproval?: boolean;
}

interface ContractRenewalDialogProps {
  isOpen: boolean;
  onClose: () => void;
  contract: Contract;
  onSuccess?: () => void;
}

// ============================================================================
// Constants
// ============================================================================

const RENEWAL_TYPES = {
  EXTEND: {
    label: 'Extend Current Term',
    description: 'Keep same terms, extend end date',
    icon: Calendar,
  },
  NEW_TERM: {
    label: 'New Contract Term',
    description: 'Start fresh term with updated terms',
    icon: RefreshCw,
  },
  AMENDMENT: {
    label: 'Amendment',
    description: 'Modify existing contract terms',
    icon: FileText,
  },
};

const TERM_PRESETS = [
  { label: '6 months', months: 6 },
  { label: '1 year', months: 12 },
  { label: '2 years', months: 24 },
  { label: '3 years', months: 36 },
];

const VALUE_ADJUSTMENTS = [
  { label: 'No change', percent: 0 },
  { label: '+5%', percent: 5 },
  { label: '+10%', percent: 10 },
  { label: '+15%', percent: 15 },
  { label: 'Custom', percent: null },
];

// ============================================================================
// Helper Functions
// ============================================================================

function formatCurrency(amount: number, currency: string = 'USD'): string {
  if (currency === 'INR') {
    if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)}Cr`;
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)}L`;
    return `₹${amount.toLocaleString('en-IN')}`;
  }
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function addMonthsToDate(dateStr: string, months: number): string {
  const date = new Date(dateStr);
  date.setMonth(date.getMonth() + months);
  return date.toISOString().split('T')[0];
}

function calculateNewValue(currentValue: number, percentChange: number): number {
  return currentValue * (1 + percentChange / 100);
}

// ============================================================================
// Renewal Type Selector
// ============================================================================

interface RenewalTypeSelectorProps {
  value: RenewalOptions['renewalType'];
  onChange: (type: RenewalOptions['renewalType']) => void;
}

function RenewalTypeSelector({ value, onChange }: RenewalTypeSelectorProps) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {Object.entries(RENEWAL_TYPES).map(([type, config]) => {
        const Icon = config.icon;
        const isSelected = value === type;
        
        return (
          <button
            key={type}
            type="button"
            className={cn(
              'p-4 rounded-lg border-2 text-left transition-all',
              isSelected
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            )}
            onClick={() => onChange(type as RenewalOptions['renewalType'])}
          >
            <Icon
              className={cn(
                'h-6 w-6 mb-2',
                isSelected ? 'text-blue-600' : 'text-gray-400'
              )}
            />
            <p className={cn('font-medium', isSelected ? 'text-blue-900' : 'text-gray-900')}>
              {config.label}
            </p>
            <p className="text-xs text-gray-500 mt-1">{config.description}</p>
          </button>
        );
      })}
    </div>
  );
}

// ============================================================================
// Term Selector
// ============================================================================

interface TermSelectorProps {
  currentEndDate: string;
  newEndDate: string;
  onChange: (date: string) => void;
}

function TermSelector({ currentEndDate, newEndDate, onChange }: TermSelectorProps) {
  const baseDate = currentEndDate || new Date().toISOString();
  
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {TERM_PRESETS.map((preset) => {
          const presetDate = addMonthsToDate(baseDate, preset.months);
          const isSelected = newEndDate === presetDate;
          
          return (
            <button
              key={preset.months}
              type="button"
              className={cn(
                'px-4 py-2 rounded-lg border text-sm font-medium transition-colors',
                isSelected
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 hover:border-gray-300 text-gray-700'
              )}
              onClick={() => onChange(presetDate)}
            >
              {preset.label}
            </button>
          );
        })}
      </div>
      <div>
        <label className="text-sm text-gray-600">Or select custom date:</label>
        <Input
          type="date"
          value={newEndDate}
          onChange={(e) => onChange(e.target.value)}
          min={currentEndDate}
          className="mt-1"
        />
      </div>
    </div>
  );
}

// ============================================================================
// Value Adjustment Selector
// ============================================================================

interface ValueAdjustmentSelectorProps {
  currentValue: number;
  selectedPercent: number | null;
  customValue: number;
  onChange: (percent: number | null, customValue?: number) => void;
  currency: string;
}

function ValueAdjustmentSelector({
  currentValue,
  selectedPercent,
  customValue,
  onChange,
  currency,
}: ValueAdjustmentSelectorProps) {
  const isCustom = selectedPercent === null;
  
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {VALUE_ADJUSTMENTS.map((adj) => {
          const isSelected = selectedPercent === adj.percent;
          
          return (
            <button
              key={adj.label}
              type="button"
              className={cn(
                'px-4 py-2 rounded-lg border text-sm font-medium transition-colors',
                isSelected
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 hover:border-gray-300 text-gray-700'
              )}
              onClick={() => onChange(adj.percent)}
            >
              {adj.label}
            </button>
          );
        })}
      </div>
      
      {isCustom && (
        <div>
          <label className="text-sm text-gray-600">Custom value:</label>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={customValue}
            onChange={(e) => onChange(null, parseFloat(e.target.value) || 0)}
            className="mt-1"
          />
        </div>
      )}
      
      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
        <span className="text-sm text-gray-600">Current Value:</span>
        <span className="font-medium">{formatCurrency(currentValue, currency)}</span>
      </div>
      
      {selectedPercent !== null && selectedPercent !== 0 && (
        <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
          <span className="text-sm text-green-600">New Value:</span>
          <span className="font-medium text-green-700">
            {formatCurrency(calculateNewValue(currentValue, selectedPercent), currency)}
          </span>
        </div>
      )}
      
      {isCustom && customValue > 0 && (
        <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
          <span className="text-sm text-green-600">New Value:</span>
          <span className="font-medium text-green-700">
            {formatCurrency(customValue, currency)}
          </span>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Summary Panel
// ============================================================================

interface SummaryPanelProps {
  contract: Contract;
  options: RenewalOptions;
}

function SummaryPanel({ contract, options }: SummaryPanelProps) {
  const renewalTypeConfig = RENEWAL_TYPES[options.renewalType];
  
  const newValue = options.newValue || 
    (options.valueChangePercent !== undefined && options.valueChangePercent !== null && contract.value 
      ? calculateNewValue(contract.value, options.valueChangePercent) 
      : contract.value);

  return (
    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
      <h4 className="font-medium text-blue-900 mb-3 flex items-center gap-2">
        <CheckCircle2 className="h-5 w-5" />
        Renewal Summary
      </h4>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-blue-700">Renewal Type:</span>
          <span className="font-medium text-blue-900">{renewalTypeConfig.label}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-blue-700">Current End Date:</span>
          <span className="font-medium text-blue-900">{formatDate(contract.endDate || '')}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-blue-700">New End Date:</span>
          <span className="font-medium text-blue-900">{formatDate(options.newEndDate)}</span>
        </div>
        {contract.value && newValue && newValue !== contract.value && (
          <>
            <div className="flex justify-between">
              <span className="text-blue-700">Current Value:</span>
              <span className="font-medium text-blue-900">
                {formatCurrency(contract.value, contract.currency)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-blue-700">New Value:</span>
              <span className="font-medium text-green-700">
                {formatCurrency(newValue, contract.currency)}
                {options.valueChangePercent && options.valueChangePercent > 0 && (
                  <span className="ml-1 text-xs">(+{options.valueChangePercent}%)</span>
                )}
              </span>
            </div>
          </>
        )}
        <div className="flex justify-between">
          <span className="text-blue-700">Auto-Renew:</span>
          <span className="font-medium text-blue-900">
            {options.autoRenew ? 'Enabled' : 'Disabled'}
          </span>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function ContractRenewalDialog({
  isOpen,
  onClose,
  contract,
  onSuccess,
}: ContractRenewalDialogProps) {
  const queryClient = useQueryClient();
  
  // Form state
  const [options, setOptions] = useState<RenewalOptions>({
    renewalType: 'EXTEND',
    newEndDate: contract.endDate 
      ? addMonthsToDate(contract.endDate, 12) 
      : addMonthsToDate(new Date().toISOString(), 12),
    valueChangePercent: 0,
    autoRenew: contract.autoRenew,
    notes: '',
  });
  
  const [customValue, setCustomValue] = useState(contract.value || 0);
  const [step, setStep] = useState(1);

  // Reset when dialog opens
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setOptions({
        renewalType: 'EXTEND',
        newEndDate: contract.endDate 
          ? addMonthsToDate(contract.endDate, 12) 
          : addMonthsToDate(new Date().toISOString(), 12),
        valueChangePercent: 0,
        autoRenew: contract.autoRenew,
        notes: '',
      });
      setCustomValue(contract.value || 0);
    }
  }, [isOpen, contract]);

  // Renewal mutation
  const renewMutation = useMutation({
    mutationFn: async () => {
      const data: any = {
        newEndDate: new Date(options.newEndDate),
        notes: options.notes,
      };

      if (options.valueChangePercent !== undefined && options.valueChangePercent !== null && options.valueChangePercent !== 0 && contract.value) {
        data.newValue = calculateNewValue(contract.value, options.valueChangePercent);
      } else if (options.newValue) {
        data.newValue = options.newValue;
      } else if (options.valueChangePercent === undefined && customValue > 0) {
        data.newValue = customValue;
      }

      return api.post(`/contracts/${contract.id}/renew`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      queryClient.invalidateQueries({ queryKey: ['contract', contract.id] });
      onSuccess?.();
      onClose();
    },
  });

  const handleValueChange = (percent: number | null, value?: number) => {
    if (percent !== null) {
      setOptions({ ...options, valueChangePercent: percent, newValue: undefined });
    } else {
      setOptions({ ...options, valueChangePercent: undefined });
      if (value !== undefined) setCustomValue(value);
    }
  };

  const canProceed = () => {
    if (step === 1) return true;
    if (step === 2) return !!options.newEndDate;
    if (step === 3) return true;
    return true;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-blue-600" />
            Renew Contract
          </DialogTitle>
        </DialogHeader>
        
        <DialogBody className="space-y-6">
          {/* Contract Info */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium text-gray-900">{contract.name}</h3>
            <p className="text-sm text-gray-500">{contract.contractNumber}</p>
            {contract.endDate && (
              <p className="text-sm text-gray-500 mt-1">
                Current end date: {formatDate(contract.endDate)}
              </p>
            )}
          </div>

          {/* Step 1: Renewal Type */}
          {step === 1 && (
            <div>
              <h4 className="font-medium text-gray-900 mb-3">1. Select Renewal Type</h4>
              <RenewalTypeSelector
                value={options.renewalType}
                onChange={(type) => setOptions({ ...options, renewalType: type })}
              />
            </div>
          )}

          {/* Step 2: New Term */}
          {step === 2 && (
            <div>
              <h4 className="font-medium text-gray-900 mb-3">2. Set New Term</h4>
              <TermSelector
                currentEndDate={contract.endDate || new Date().toISOString()}
                newEndDate={options.newEndDate}
                onChange={(date) => setOptions({ ...options, newEndDate: date })}
              />
            </div>
          )}

          {/* Step 3: Value Adjustment */}
          {step === 3 && contract.value && (
            <div>
              <h4 className="font-medium text-gray-900 mb-3">3. Value Adjustment</h4>
              <ValueAdjustmentSelector
                currentValue={contract.value}
                selectedPercent={options.valueChangePercent ?? 0}
                customValue={customValue}
                onChange={handleValueChange}
                currency={contract.currency}
              />
            </div>
          )}

          {/* Step 4: Additional Options & Confirm */}
          {step === 4 && (
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900 mb-3">4. Review & Confirm</h4>
              
              <SummaryPanel contract={contract} options={options} />
              
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="autoRenew"
                    checked={options.autoRenew}
                    onChange={(e) => setOptions({ ...options, autoRenew: e.target.checked })}
                    className="rounded border-gray-300"
                  />
                  <label htmlFor="autoRenew" className="text-sm text-gray-700">
                    Enable auto-renewal for this contract
                  </label>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-700">Notes</label>
                  <textarea
                    className="w-full mt-1 border border-gray-300 rounded-md px-3 py-2 text-sm"
                    rows={3}
                    value={options.notes}
                    onChange={(e) => setOptions({ ...options, notes: e.target.value })}
                    placeholder="Add any notes about this renewal..."
                  />
                </div>
              </div>
            </div>
          )}

          {/* Progress Indicator */}
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className={cn(
                  'w-2 h-2 rounded-full transition-colors',
                  s === step ? 'bg-blue-600' : s < step ? 'bg-blue-300' : 'bg-gray-200'
                )}
              />
            ))}
          </div>
        </DialogBody>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          
          {step > 1 && (
            <Button variant="outline" onClick={() => setStep(step - 1)}>
              Back
            </Button>
          )}
          
          {step < 4 ? (
            <Button onClick={() => setStep(step + 1)} disabled={!canProceed()}>
              Next
            </Button>
          ) : (
            <Button
              onClick={() => renewMutation.mutate()}
              disabled={renewMutation.isPending}
            >
              {renewMutation.isPending ? 'Processing...' : 'Confirm Renewal'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
