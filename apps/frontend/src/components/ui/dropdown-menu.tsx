import * as React from 'react';
import { cn } from '@/lib/utils';

// ============================================================================
// Dropdown Menu Context
// ============================================================================

interface DropdownContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const DropdownContext = React.createContext<DropdownContextValue | null>(null);

function useDropdownContext() {
  const context = React.useContext(DropdownContext);
  if (!context) {
    throw new Error('Dropdown components must be used within a DropdownMenu');
  }
  return context;
}

// ============================================================================
// Dropdown Menu Root
// ============================================================================

interface DropdownMenuProps {
  children: React.ReactNode;
}

export function DropdownMenu({ children }: DropdownMenuProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <DropdownContext.Provider value={{ open, setOpen }}>
      <div className="relative inline-block">
        {children}
      </div>
    </DropdownContext.Provider>
  );
}

// ============================================================================
// Dropdown Trigger
// ============================================================================

interface DropdownMenuTriggerProps {
  children: React.ReactNode;
  asChild?: boolean;
}

export function DropdownMenuTrigger({ children, asChild }: DropdownMenuTriggerProps) {
  const { open, setOpen } = useDropdownContext();

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setOpen(!open);
  };

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<{ onClick?: (e: React.MouseEvent) => void }>, {
      onClick: handleClick,
    });
  }

  return (
    <button type="button" onClick={handleClick}>
      {children}
    </button>
  );
}

// ============================================================================
// Dropdown Content
// ============================================================================

interface DropdownMenuContentProps {
  children: React.ReactNode;
  className?: string;
  align?: 'start' | 'center' | 'end';
}

export function DropdownMenuContent({ children, className, align = 'end' }: DropdownMenuContentProps) {
  const { open, setOpen } = useDropdownContext();
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open, setOpen]);

  if (!open) return null;

  const alignmentClasses = {
    start: 'left-0',
    center: 'left-1/2 -translate-x-1/2',
    end: 'right-0',
  };

  return (
    <div
      ref={ref}
      className={cn(
        'absolute z-50 mt-1 min-w-[160px] bg-white border rounded-lg shadow-lg py-1',
        'animate-in fade-in-0 zoom-in-95',
        alignmentClasses[align],
        className
      )}
    >
      {children}
    </div>
  );
}

// ============================================================================
// Dropdown Item
// ============================================================================

interface DropdownMenuItemProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
  destructive?: boolean;
}

export function DropdownMenuItem({
  children,
  onClick,
  className,
  disabled,
  destructive,
}: DropdownMenuItemProps) {
  const { setOpen } = useDropdownContext();

  const handleClick = () => {
    if (!disabled) {
      onClick?.();
      setOpen(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className={cn(
        'w-full px-3 py-2 text-left text-sm flex items-center gap-2 transition-colors',
        'hover:bg-gray-100 focus:bg-gray-100 focus:outline-none',
        disabled && 'opacity-50 cursor-not-allowed',
        destructive && 'text-red-600 hover:bg-red-50 focus:bg-red-50',
        className
      )}
    >
      {children}
    </button>
  );
}

// ============================================================================
// Dropdown Separator
// ============================================================================

export function DropdownMenuSeparator() {
  return <div className="my-1 border-t border-gray-100" />;
}

// ============================================================================
// Dropdown Label
// ============================================================================

interface DropdownMenuLabelProps {
  children: React.ReactNode;
  className?: string;
}

export function DropdownMenuLabel({ children, className }: DropdownMenuLabelProps) {
  return (
    <div className={cn('px-3 py-2 text-xs font-semibold text-gray-500', className)}>
      {children}
    </div>
  );
}
