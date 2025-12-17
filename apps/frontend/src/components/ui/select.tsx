import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================================
// Select Context
// ============================================================================

interface SelectContextValue {
  value: string;
  onValueChange: (value: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
}

const SelectContext = React.createContext<SelectContextValue | null>(null);

function useSelectContext() {
  const context = React.useContext(SelectContext);
  if (!context) {
    throw new Error('Select components must be used within a Select');
  }
  return context;
}

// ============================================================================
// Select Root
// ============================================================================

interface SelectProps {
  children: React.ReactNode;
  value?: string;
  onValueChange?: (value: string) => void;
  defaultValue?: string;
}

export function Select({
  children,
  value: controlledValue,
  onValueChange,
  defaultValue = '',
}: SelectProps) {
  const [uncontrolledValue, setUncontrolledValue] = React.useState(defaultValue);
  const [open, setOpen] = React.useState(false);
  
  const isControlled = controlledValue !== undefined;
  const value = isControlled ? controlledValue : uncontrolledValue;
  
  const handleValueChange = React.useCallback(
    (newValue: string) => {
      if (!isControlled) {
        setUncontrolledValue(newValue);
      }
      onValueChange?.(newValue);
      setOpen(false);
    },
    [isControlled, onValueChange]
  );

  return (
    <SelectContext.Provider value={{ value, onValueChange: handleValueChange, open, setOpen }}>
      <div className="relative">
        {children}
      </div>
    </SelectContext.Provider>
  );
}

// ============================================================================
// Select Trigger
// ============================================================================

interface SelectTriggerProps {
  children: React.ReactNode;
  className?: string;
  placeholder?: string;
}

export function SelectTrigger({ children, className, placeholder }: SelectTriggerProps) {
  const { value, open, setOpen } = useSelectContext();

  return (
    <button
      type="button"
      onClick={() => setOpen(!open)}
      className={cn(
        'flex items-center justify-between w-full px-3 py-2 text-left bg-white border rounded-lg',
        'hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary',
        'disabled:bg-gray-50 disabled:text-gray-500',
        className
      )}
    >
      <span className={cn(!value && 'text-gray-400')}>
        {children || placeholder || 'Select...'}
      </span>
      <ChevronDown className={cn('h-4 w-4 text-gray-400 transition-transform', open && 'rotate-180')} />
    </button>
  );
}

// ============================================================================
// Select Value
// ============================================================================

interface SelectValueProps {
  placeholder?: string;
}

export function SelectValue({ placeholder }: SelectValueProps) {
  const { value } = useSelectContext();
  return <>{value || placeholder}</>;
}

// ============================================================================
// Select Content
// ============================================================================

interface SelectContentProps {
  children: React.ReactNode;
  className?: string;
}

export function SelectContent({ children, className }: SelectContentProps) {
  const { open, setOpen } = useSelectContext();
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open, setOpen]);

  if (!open) return null;

  return (
    <div
      ref={ref}
      className={cn(
        'absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-auto',
        'animate-in fade-in-0 zoom-in-95',
        className
      )}
    >
      {children}
    </div>
  );
}

// ============================================================================
// Select Item
// ============================================================================

interface SelectItemProps {
  children: React.ReactNode;
  value: string;
  className?: string;
  disabled?: boolean;
}

export function SelectItem({ children, value, className, disabled }: SelectItemProps) {
  const { value: selectedValue, onValueChange } = useSelectContext();
  const isSelected = selectedValue === value;

  return (
    <button
      type="button"
      onClick={() => !disabled && onValueChange(value)}
      disabled={disabled}
      className={cn(
        'w-full px-3 py-2 text-left text-sm hover:bg-gray-100 transition-colors',
        isSelected && 'bg-primary/10 text-primary font-medium',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      {children}
    </button>
  );
}

// ============================================================================
// Select Group
// ============================================================================

interface SelectGroupProps {
  children: React.ReactNode;
}

export function SelectGroup({ children }: SelectGroupProps) {
  return <div className="py-1">{children}</div>;
}

// ============================================================================
// Select Label
// ============================================================================

interface SelectLabelProps {
  children: React.ReactNode;
  className?: string;
}

export function SelectLabel({ children, className }: SelectLabelProps) {
  return (
    <div className={cn('px-3 py-2 text-xs font-semibold text-gray-500 uppercase', className)}>
      {children}
    </div>
  );
}

// ============================================================================
// Select Separator
// ============================================================================

export function SelectSeparator() {
  return <div className="my-1 border-t border-gray-100" />;
}
