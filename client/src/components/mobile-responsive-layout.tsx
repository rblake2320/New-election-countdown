/**
 * Mobile Responsive Layout Components
 * Optimized for touch interaction and small screens
 */

import { useState, useEffect, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { X, ChevronLeft, Menu } from 'lucide-react';

interface MobileContainerProps {
  children: ReactNode;
  className?: string;
}

/**
 * Mobile-first container with proper spacing and touch targets
 */
export function MobileContainer({ children, className }: MobileContainerProps) {
  return (
    <div className={cn(
      "px-4 sm:px-6 lg:px-8", // Responsive padding
      "space-y-4 sm:space-y-6", // Responsive spacing
      "min-h-screen w-full", // Full height mobile-first
      className
    )}>
      {children}
    </div>
  );
}

interface TouchCardProps {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  pressable?: boolean;
}

/**
 * Touch-optimized card component with proper feedback
 */
export function TouchCard({ children, onClick, className, pressable = true }: TouchCardProps) {
  const [isPressed, setIsPressed] = useState(false);

  return (
    <div
      className={cn(
        "bg-white dark:bg-gray-800 rounded-lg shadow-md",
        "border border-gray-200 dark:border-gray-700",
        "transition-all duration-150 ease-out",
        // Touch feedback
        pressable && onClick && [
          "cursor-pointer touch-manipulation",
          "active:scale-[0.98] active:shadow-sm",
          "hover:shadow-lg hover:border-gray-300 dark:hover:border-gray-600",
          isPressed && "scale-[0.98] shadow-sm"
        ],
        // Mobile-first spacing
        "p-4 sm:p-6",
        "min-h-[120px] sm:min-h-[140px]", // Minimum touch target
        className
      )}
      onClick={onClick}
      onTouchStart={() => setIsPressed(true)}
      onTouchEnd={() => setIsPressed(false)}
      onTouchCancel={() => setIsPressed(false)}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      data-testid="touch-card"
    >
      {children}
    </div>
  );
}

interface MobileButtonProps {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  disabled?: boolean;
  loading?: boolean;
}

/**
 * Mobile-optimized button with proper touch targets
 */
export function MobileButton({ 
  children, 
  onClick, 
  variant = 'primary', 
  size = 'md',
  className,
  disabled = false,
  loading = false
}: MobileButtonProps) {
  const sizeClasses = {
    sm: "h-10 px-4 text-sm", // 40px minimum for touch
    md: "h-12 px-6 text-base", // 48px recommended for touch
    lg: "h-14 px-8 text-lg" // 56px for primary actions
  };

  const variantClasses = {
    primary: "bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg",
    secondary: "bg-gray-600 hover:bg-gray-700 text-white shadow-md hover:shadow-lg", 
    outline: "border-2 border-blue-600 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950",
    ghost: "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
  };

  return (
    <Button
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(
        sizeClasses[size],
        variantClasses[variant],
        "rounded-lg font-medium transition-all duration-150",
        "active:scale-95 touch-manipulation",
        "focus:ring-4 focus:ring-offset-2 focus:ring-blue-300 dark:focus:ring-blue-600",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
      data-testid="mobile-button"
    >
      {loading ? (
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          {children}
        </div>
      ) : children}
    </Button>
  );
}

interface MobileModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'full';
}

/**
 * Mobile-optimized modal with bottom sheet behavior on small screens
 */
export function MobileModal({ isOpen, onClose, title, children, size = 'md' }: MobileModalProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  if (isMobile) {
    // Use sheet component for mobile (bottom sheet behavior)
    return (
      <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <SheetContent
          side="bottom"
          className="h-[85vh] rounded-t-xl border-0 p-0"
          data-testid="mobile-modal-sheet"
        >
          <SheetHeader className="p-6 pb-4 border-b bg-white dark:bg-gray-900">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-lg font-semibold">{title}</SheetTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"
                data-testid="mobile-modal-close"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </SheetHeader>
          <div className="flex-1 overflow-auto p-6 bg-gray-50 dark:bg-gray-950">
            {children}
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  // Desktop modal
  const sizeClasses = {
    sm: "max-w-md",
    md: "max-w-2xl",
    lg: "max-w-4xl",
    full: "max-w-7xl"
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent 
        className={cn(
          sizeClasses[size],
          "max-h-[90vh] overflow-auto",
          "sm:rounded-xl" // More rounded on desktop
        )}
        data-testid="desktop-modal"
      >
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">{title}</DialogTitle>
        </DialogHeader>
        <div className="mt-4">
          {children}
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface ResponsiveGridProps {
  children: ReactNode;
  columns?: {
    mobile?: number;
    tablet?: number;
    desktop?: number;
  };
  gap?: string;
  className?: string;
}

/**
 * Responsive grid with mobile-first breakpoints
 */
export function ResponsiveGrid({ 
  children, 
  columns = { mobile: 1, tablet: 2, desktop: 3 },
  gap = "4",
  className 
}: ResponsiveGridProps) {
  const gridClasses = cn(
    "grid",
    `gap-${gap}`,
    `grid-cols-${columns.mobile}`, // Mobile first
    `sm:grid-cols-${columns.tablet}`, // Tablet
    `lg:grid-cols-${columns.desktop}`, // Desktop
    className
  );

  return (
    <div className={gridClasses} data-testid="responsive-grid">
      {children}
    </div>
  );
}

interface MobileNavigationProps {
  isOpen: boolean;
  onToggle: () => void;
  children: ReactNode;
}

/**
 * Mobile-first navigation with hamburger menu
 */
export function MobileNavigation({ isOpen, onToggle, children }: MobileNavigationProps) {
  return (
    <>
      {/* Mobile menu button */}
      <div className="md:hidden">
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggle}
          className="h-10 w-10 p-0"
          data-testid="mobile-nav-toggle"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      {/* Mobile navigation sheet */}
      <Sheet open={isOpen} onOpenChange={onToggle}>
        <SheetContent 
          side="left" 
          className="w-80 p-0"
          data-testid="mobile-nav-sheet"
        >
          <div className="flex flex-col h-full">
            <SheetHeader className="p-6 border-b">
              <SheetTitle>Navigation</SheetTitle>
            </SheetHeader>
            <div className="flex-1 overflow-auto p-6">
              {children}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Desktop navigation - always visible */}
      <div className="hidden md:block">
        {children}
      </div>
    </>
  );
}

/**
 * Hook to detect mobile viewport
 */
export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile;
}

/**
 * Hook for touch gesture handling
 */
export function useTouchGestures(onSwipeLeft?: () => void, onSwipeRight?: () => void) {
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    setTouchStart({ x: touch.clientX, y: touch.clientY });
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart) return;

    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStart.x;
    const deltaY = Math.abs(touch.clientY - touchStart.y);

    // Only trigger swipe if horizontal movement is greater than vertical
    if (Math.abs(deltaX) > deltaY && Math.abs(deltaX) > 50) {
      if (deltaX > 0 && onSwipeRight) {
        onSwipeRight();
      } else if (deltaX < 0 && onSwipeLeft) {
        onSwipeLeft();
      }
    }

    setTouchStart(null);
  };

  return {
    onTouchStart: handleTouchStart,
    onTouchEnd: handleTouchEnd
  };
}