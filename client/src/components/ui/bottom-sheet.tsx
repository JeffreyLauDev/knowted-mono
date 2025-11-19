import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { Button } from './button';

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  showCloseButton?: boolean;
  showApplyButton?: boolean;
  applyButtonText?: string;
  onApply?: () => void;
  maxHeight?: string;
  enableSwipeToClose?: boolean;
  enableBackdropClose?: boolean;
  className?: string;
}

const BottomSheet: React.FC<BottomSheetProps> = ({
  open,
  onClose,
  title,
  children,
  showCloseButton = true,
  showApplyButton = false,
  applyButtonText = 'Apply',
  onApply,
  maxHeight = '85vh',
  enableSwipeToClose = true,
  enableBackdropClose = false,
  className = ''
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [lastTouchTime, setLastTouchTime] = useState(0);

  // Touch gesture handlers for swipe to close
  const minSwipeDistance = 30;

  const onTouchStart = (e: React.TouchEvent): void => {
    if (!enableSwipeToClose) {
      return;
    }

    const now = Date.now();
    if (now - lastTouchTime < 100) {
      return; // Debounce rapid touches
    }

    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientY);
    setIsDragging(true);
    setLastTouchTime(now);
  };

  const onTouchMove = (e: React.TouchEvent): void => {
    if (!enableSwipeToClose || !isDragging) {
      return;
    }
    setTouchEnd(e.targetTouches[0].clientY);
  };

  const onTouchEnd = async (): Promise<void> => {
    if (!enableSwipeToClose || !touchStart || !touchEnd) {
      setIsDragging(false);
      return;
    }

    const distance = touchStart - touchEnd;
    const isDownSwipe = distance < -minSwipeDistance;

    if (isDownSwipe) {
      // Haptic feedback for swipe to close
      try {
        await Haptics.impact({ style: ImpactStyle.Light });
      } catch {
        // Silently fail if haptics are not available
      }
      onClose();
    }

    setIsDragging(false);
  };

  const handleClose = async (): Promise<void> => {
    try {
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch {
      // Silently fail if haptics are not available
    }
    onClose();
  };

  const handleApply = async (): Promise<void> => {
    try {
      await Haptics.impact({ style: ImpactStyle.Medium });
    } catch {
      // Silently fail if haptics are not available
    }
    if (onApply) {
      onApply();
    }
    onClose();
  };

  const handleBackdropClick = (): void => {
    if (enableBackdropClose) {
      onClose();
    }
  };

  // Prevent body scroll when bottom sheet is open
  useEffect((): (() => void) => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    // Cleanup on unmount
    return (): void => {
      document.body.style.overflow = 'unset';
    };
  }, [open]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50 animate-in fade-in duration-200"
        onClick={handleBackdropClick}
      />

      {/* Bottom Sheet */}
      <div
        className={`absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl border-t-2 border-gray-200 safe-area-inset-bottom animate-in slide-in-from-bottom duration-300 ease-out ${className}`}
        style={{ maxHeight }}
      >
        <div className="flex flex-col h-full">
          {/* Drag Handle */}
          {enableSwipeToClose && (
            <div
              className={`flex justify-center py-3 border-b border-gray-100 cursor-grab active:cursor-grabbing select-none transition-colors ${
                isDragging ? 'bg-gray-50' : ''
              }`}
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              onTouchEnd={onTouchEnd}
              style={{ touchAction: 'none' }}
            >
              <div className={`w-12 h-1 rounded-full transition-colors ${
                isDragging ? 'bg-gray-400' : 'bg-gray-300'
              }`}></div>
            </div>
          )}

          {/* Header */}
          {(title || showCloseButton) && (
            <div className="px-6 py-4 border-b border-gray-100">
              <div className="flex items-center justify-between">
                {title && (
                  <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
                )}
                {showCloseButton && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClose}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Content */}
          <div
            className="flex-1 overflow-y-auto scroll-smooth"
            style={{ scrollBehavior: 'smooth' }}
          >
            {children}
          </div>

          {/* Footer with Apply Button */}
          {showApplyButton && (
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 safe-area-inset-bottom">
              <Button onClick={handleApply} className="w-full">
                {applyButtonText}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export { BottomSheet };
export type { BottomSheetProps };

