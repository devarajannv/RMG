import * as React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================================
// Dialog Context
// ============================================================================

interface DialogContextValue {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DialogContext = React.createContext<DialogContextValue | null>(null);

function useDialogContext() {
  const context = React.useContext(DialogContext);
  if (!context) {
    throw new Error('Dialog components must be used within a Dialog');
  }
  return context;
}

// ============================================================================
// Dialog Root
// ============================================================================

interface DialogProps {
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultOpen?: boolean;
}

export function Dialog({
  children,
  open: controlledOpen,
  onOpenChange,
  defaultOpen = false,
}: DialogProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen);
  
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;
  
  const handleOpenChange = React.useCallback(
    (newOpen: boolean) => {
      if (!isControlled) {
        setUncontrolledOpen(newOpen);
      }
      onOpenChange?.(newOpen);
    },
    [isControlled, onOpenChange]
  );

  return (
    <DialogContext.Provider value={{ open, onOpenChange: handleOpenChange }}>
      {children}
    </DialogContext.Provider>
  );
}

// ============================================================================
// Dialog Trigger
// ============================================================================

interface DialogTriggerProps {
  children: React.ReactNode;
  asChild?: boolean;
}

export function DialogTrigger({ children, asChild }: DialogTriggerProps) {
  const { onOpenChange } = useDialogContext();

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<{ onClick?: () => void }>, {
      onClick: () => onOpenChange(true),
    });
  }

  return (
    <button type="button" onClick={() => onOpenChange(true)}>
      {children}
    </button>
  );
}

// ============================================================================
// Dialog Portal & Overlay
// ============================================================================

interface DialogContentProps {
  children: React.ReactNode;
  className?: string;
  onClose?: () => void;
  /** When true, backdrop click is blocked (with shake) and Escape shows a discard confirmation */
  preventDismiss?: boolean;
}

export function DialogContent({ children, className, onClose, preventDismiss = false }: DialogContentProps) {
  const { open, onOpenChange } = useDialogContext();
  const [showDiscardConfirm, setShowDiscardConfirm] = React.useState(false);
  const [shaking, setShaking] = React.useState(false);

  // Reset internal state when dialog closes
  React.useEffect(() => {
    if (!open) {
      setShowDiscardConfirm(false);
      setShaking(false);
    }
  }, [open]);

  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (preventDismiss) {
          e.preventDefault();
          e.stopPropagation();
          setShowDiscardConfirm(true);
        } else {
          onOpenChange(false);
          onClose?.();
        }
      }
    };

    if (open) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [open, onOpenChange, onClose, preventDismiss]);

  if (!open) return null;

  const handleBackdropClick = () => {
    if (preventDismiss) {
      setShowDiscardConfirm(true);
    } else {
      onOpenChange(false);
      onClose?.();
    }
  };

  const handleDiscard = () => {
    setShowDiscardConfirm(false);
    onOpenChange(false);
    onClose?.();
  };

  const handleCloseButton = () => {
    if (preventDismiss) {
      setShowDiscardConfirm(true);
    } else {
      onOpenChange(false);
      onClose?.();
    }
  };

  return (
    <div className="fixed inset-0 z-50">
      {/* Overlay (visual only — clicks handled by content container) */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in-0" />
      
      {/* Clickable content container — clicking here (outside the panel) = backdrop click */}
      <div
        className="fixed inset-0 flex items-center justify-center p-4"
        onClick={handleBackdropClick}
      >
        <div
          role="dialog"
          aria-modal="true"
          className={cn(
            'relative bg-white rounded-xl shadow-2xl max-h-[90vh] overflow-auto animate-in fade-in-0 zoom-in-95',
            'w-full max-w-lg',
            shaking && 'animate-dialog-shake',
            className
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close X button */}
          <button
            type="button"
            onClick={handleCloseButton}
            className="absolute top-4 right-4 z-20 p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50"
            aria-label="Close dialog"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Discard confirmation overlay */}
          {showDiscardConfirm && (
            <div
              className="absolute inset-0 z-30 bg-white/95 backdrop-blur-sm flex items-center justify-center rounded-xl"
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="discard-title"
              aria-describedby="discard-desc"
            >
              <div className="text-center p-6 space-y-4 max-w-sm">
                <div className="mx-auto w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                  <svg className="w-6 h-6 text-amber-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                  </svg>
                </div>
                <h3 id="discard-title" className="text-lg font-semibold text-gray-900">
                  Discard unsaved changes?
                </h3>
                <p id="discard-desc" className="text-sm text-gray-500">
                  Any information you&apos;ve entered will be lost.
                </p>
                <div className="flex gap-3 justify-center pt-2">
                  <button
                    type="button"
                    onClick={() => setShowDiscardConfirm(false)}
                    className="px-4 py-2 text-sm font-medium bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50"
                    autoFocus
                  >
                    Keep Editing
                  </button>
                  <button
                    type="button"
                    onClick={handleDiscard}
                    className="px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500/50"
                  >
                    Discard
                  </button>
                </div>
              </div>
            </div>
          )}
          {children}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Dialog Header
// ============================================================================

interface DialogHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export function DialogHeader({ children, className }: DialogHeaderProps) {
  return (
    <div className={cn('p-6 border-b', className)}>
      {children}
    </div>
  );
}

// ============================================================================
// Dialog Title
// ============================================================================

interface DialogTitleProps {
  children: React.ReactNode;
  className?: string;
}

export function DialogTitle({ children, className }: DialogTitleProps) {
  return (
    <h2 className={cn('text-xl font-semibold text-gray-900', className)}>
      {children}
    </h2>
  );
}

// ============================================================================
// Dialog Description
// ============================================================================

interface DialogDescriptionProps {
  children: React.ReactNode;
  className?: string;
}

export function DialogDescription({ children, className }: DialogDescriptionProps) {
  return (
    <p className={cn('text-sm text-gray-500 mt-1', className)}>
      {children}
    </p>
  );
}

// ============================================================================
// Dialog Body
// ============================================================================

interface DialogBodyProps {
  children: React.ReactNode;
  className?: string;
}

export function DialogBody({ children, className }: DialogBodyProps) {
  return (
    <div className={cn('p-6', className)}>
      {children}
    </div>
  );
}

// ============================================================================
// Dialog Footer
// ============================================================================

interface DialogFooterProps {
  children: React.ReactNode;
  className?: string;
}

export function DialogFooter({ children, className }: DialogFooterProps) {
  return (
    <div className={cn('p-6 border-t bg-gray-50 flex justify-end gap-3', className)}>
      {children}
    </div>
  );
}

// ============================================================================
// Dialog Close Button
// ============================================================================

interface DialogCloseProps {
  children?: React.ReactNode;
  className?: string;
  asChild?: boolean;
}

export function DialogClose({ children, className, asChild }: DialogCloseProps) {
  const { onOpenChange } = useDialogContext();

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<{ onClick?: () => void }>, {
      onClick: () => onOpenChange(false),
    });
  }

  if (children) {
    return (
      <button type="button" onClick={() => onOpenChange(false)} className={className}>
        {children}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onOpenChange(false)}
      className={cn(
        'absolute top-4 right-4 p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors',
        className
      )}
    >
      <X className="h-5 w-5" />
    </button>
  );
}

// ============================================================================
// Confirm Dialog (Utility Component)
// ============================================================================

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'default';
  onConfirm: () => void | Promise<void>;
  loading?: boolean;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  onConfirm,
  loading = false,
}: ConfirmDialogProps) {
  const [isLoading, setIsLoading] = React.useState(false);

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } catch (error) {
      console.error('Confirm action failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const buttonColors = {
    danger: 'bg-red-600 hover:bg-red-700 text-white',
    warning: 'bg-amber-600 hover:bg-amber-700 text-white',
    default: 'bg-primary hover:bg-primary/90 text-white',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            disabled={isLoading || loading}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isLoading || loading}
            className={cn(
              'px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50',
              buttonColors[variant]
            )}
          >
            {isLoading || loading ? 'Processing...' : confirmLabel}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
