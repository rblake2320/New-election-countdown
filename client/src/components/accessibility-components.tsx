/**
 * Accessibility Enhancement Components
 * WCAG 2.1 AA compliance components for election platform
 */

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { 
  Accessibility, 
  Volume2, 
  VolumeX, 
  Eye, 
  EyeOff, 
  Type, 
  Contrast,
  Keyboard,
  Focus,
  SkipForward,
  ArrowUp
} from 'lucide-react';

interface AccessibilityConfig {
  highContrast: boolean;
  largeText: boolean;
  screenReaderMode: boolean;
  keyboardNavigation: boolean;
  reducedMotion: boolean;
  announcements: boolean;
}

/**
 * Skip Navigation Links - WCAG 2.4.1
 */
export function SkipNavigation() {
  return (
    <div className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 z-[9999]">
      <a
        href="#main-content"
        className="bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        data-testid="skip-to-main"
      >
        Skip to main content
      </a>
      <a
        href="#navigation"
        className="bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium text-sm ml-2 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        data-testid="skip-to-nav"
      >
        Skip to navigation
      </a>
    </div>
  );
}

/**
 * Screen Reader Announcements - WCAG 4.1.3
 */
export function ScreenReaderAnnouncements() {
  const [announcements, setAnnouncements] = useState<Array<{ id: string; message: string; priority: 'polite' | 'assertive' }>>([]);

  useEffect(() => {
    const handleAnnouncement = (event: CustomEvent) => {
      const { message, priority = 'polite' } = event.detail;
      const id = Date.now().toString();
      
      setAnnouncements(prev => [...prev, { id, message, priority }]);
      
      // Auto-remove after 5 seconds
      setTimeout(() => {
        setAnnouncements(prev => prev.filter(a => a.id !== id));
      }, 5000);
    };

    window.addEventListener('accessibility-announce', handleAnnouncement as EventListener);
    return () => window.removeEventListener('accessibility-announce', handleAnnouncement as EventListener);
  }, []);

  return (
    <>
      <div
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        data-testid="announcements-polite"
      >
        {announcements
          .filter(a => a.priority === 'polite')
          .map(a => <div key={a.id}>{a.message}</div>)
        }
      </div>
      <div
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
        data-testid="announcements-assertive"
      >
        {announcements
          .filter(a => a.priority === 'assertive')
          .map(a => <div key={a.id}>{a.message}</div>)
        }
      </div>
    </>
  );
}

/**
 * Accessibility Toolbar - User Controls
 */
export function AccessibilityToolbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState<AccessibilityConfig>({
    highContrast: false,
    largeText: false,
    screenReaderMode: false,
    keyboardNavigation: true,
    reducedMotion: false,
    announcements: true
  });

  const toolbarRef = useRef<HTMLDivElement>(null);

  // Apply accessibility settings to document
  useEffect(() => {
    const root = document.documentElement;
    
    if (config.highContrast) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }
    
    if (config.largeText) {
      root.classList.add('large-text');
    } else {
      root.classList.remove('large-text');
    }
    
    if (config.reducedMotion) {
      root.classList.add('reduce-motion');
    } else {
      root.classList.remove('reduce-motion');
    }
    
    if (config.screenReaderMode) {
      root.classList.add('screen-reader-mode');
    } else {
      root.classList.remove('screen-reader-mode');
    }
  }, [config]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F1' && e.ctrlKey) {
        e.preventDefault();
        setIsOpen(!isOpen);
        announceToScreenReader('Accessibility toolbar toggled', 'polite');
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const announceToScreenReader = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (config.announcements) {
      window.dispatchEvent(new CustomEvent('accessibility-announce', {
        detail: { message, priority }
      }));
    }
  };

  const toggleSetting = (setting: keyof AccessibilityConfig) => {
    setConfig(prev => {
      const newConfig = { ...prev, [setting]: !prev[setting] };
      announceToScreenReader(`${setting} ${newConfig[setting] ? 'enabled' : 'disabled'}`, 'polite');
      return newConfig;
    });
  };

  return (
    <>
      {/* Floating accessibility button */}
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "w-12 h-12 rounded-full shadow-lg",
            "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
            "transition-all duration-200"
          )}
          aria-label="Open accessibility options"
          aria-expanded={isOpen}
          aria-controls="accessibility-toolbar"
          data-testid="accessibility-button"
        >
          <Accessibility className="h-6 w-6" />
        </Button>
      </div>

      {/* Accessibility toolbar */}
      {isOpen && (
        <div
          ref={toolbarRef}
          id="accessibility-toolbar"
          className={cn(
            "fixed bottom-20 right-4 z-50",
            "bg-background border rounded-lg shadow-xl p-4 w-80",
            "focus-within:ring-2 focus-within:ring-ring"
          )}
          role="dialog"
          aria-label="Accessibility Settings"
          data-testid="accessibility-toolbar"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Accessibility Options</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
              aria-label="Close accessibility options"
              data-testid="close-accessibility-toolbar"
            >
              ×
            </Button>
          </div>

          <div className="space-y-3">
            {/* High Contrast */}
            <div className="flex items-center justify-between">
              <label 
                htmlFor="high-contrast-toggle"
                className="text-sm font-medium flex items-center gap-2"
              >
                <Contrast className="h-4 w-4" />
                High Contrast
              </label>
              <Button
                id="high-contrast-toggle"
                variant={config.highContrast ? "default" : "outline"}
                size="sm"
                onClick={() => toggleSetting('highContrast')}
                aria-pressed={config.highContrast}
                data-testid="high-contrast-toggle"
              >
                {config.highContrast ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              </Button>
            </div>

            {/* Large Text */}
            <div className="flex items-center justify-between">
              <label 
                htmlFor="large-text-toggle"
                className="text-sm font-medium flex items-center gap-2"
              >
                <Type className="h-4 w-4" />
                Large Text
              </label>
              <Button
                id="large-text-toggle"
                variant={config.largeText ? "default" : "outline"}
                size="sm"
                onClick={() => toggleSetting('largeText')}
                aria-pressed={config.largeText}
                data-testid="large-text-toggle"
              >
                {config.largeText ? 'A+' : 'A'}
              </Button>
            </div>

            {/* Screen Reader Mode */}
            <div className="flex items-center justify-between">
              <label 
                htmlFor="screen-reader-toggle"
                className="text-sm font-medium flex items-center gap-2"
              >
                <Focus className="h-4 w-4" />
                Screen Reader Mode
              </label>
              <Button
                id="screen-reader-toggle"
                variant={config.screenReaderMode ? "default" : "outline"}
                size="sm"
                onClick={() => toggleSetting('screenReaderMode')}
                aria-pressed={config.screenReaderMode}
                data-testid="screen-reader-toggle"
              >
                {config.screenReaderMode ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              </Button>
            </div>

            {/* Keyboard Navigation */}
            <div className="flex items-center justify-between">
              <label 
                htmlFor="keyboard-nav-toggle"
                className="text-sm font-medium flex items-center gap-2"
              >
                <Keyboard className="h-4 w-4" />
                Keyboard Navigation
              </label>
              <Button
                id="keyboard-nav-toggle"
                variant={config.keyboardNavigation ? "default" : "outline"}
                size="sm"
                onClick={() => toggleSetting('keyboardNavigation')}
                aria-pressed={config.keyboardNavigation}
                data-testid="keyboard-nav-toggle"
              >
                {config.keyboardNavigation ? 'ON' : 'OFF'}
              </Button>
            </div>

            {/* Reduced Motion */}
            <div className="flex items-center justify-between">
              <label 
                htmlFor="reduced-motion-toggle"
                className="text-sm font-medium flex items-center gap-2"
              >
                <SkipForward className="h-4 w-4" />
                Reduce Motion
              </label>
              <Button
                id="reduced-motion-toggle"
                variant={config.reducedMotion ? "default" : "outline"}
                size="sm"
                onClick={() => toggleSetting('reducedMotion')}
                aria-pressed={config.reducedMotion}
                data-testid="reduced-motion-toggle"
              >
                {config.reducedMotion ? 'ON' : 'OFF'}
              </Button>
            </div>

            {/* Announcements */}
            <div className="flex items-center justify-between">
              <label 
                htmlFor="announcements-toggle"
                className="text-sm font-medium flex items-center gap-2"
              >
                <Volume2 className="h-4 w-4" />
                Announcements
              </label>
              <Button
                id="announcements-toggle"
                variant={config.announcements ? "default" : "outline"}
                size="sm"
                onClick={() => toggleSetting('announcements')}
                aria-pressed={config.announcements}
                data-testid="announcements-toggle"
              >
                {config.announcements ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t text-xs text-muted-foreground">
            <p>Press Ctrl+F1 to toggle this toolbar</p>
            <p>Use Tab to navigate, Space/Enter to activate</p>
          </div>
        </div>
      )}
    </>
  );
}

/**
 * Focus Indicator Enhancement
 */
export function FocusIndicator() {
  const [focusVisible, setFocusVisible] = useState(false);

  useEffect(() => {
    const handleFocusIn = () => setFocusVisible(true);
    const handleFocusOut = () => setFocusVisible(false);

    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('focusout', handleFocusOut);

    return () => {
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('focusout', handleFocusOut);
    };
  }, []);

  return (
    <style>{`
      .focus-indicator-enhanced *:focus-visible {
        outline: 3px solid hsl(var(--primary)) !important;
        outline-offset: 2px !important;
        box-shadow: 0 0 0 1px hsl(var(--background)) !important;
      }
    `}</style>
  );
}

/**
 * Back to Top Button - Accessibility Helper
 */
export function BackToTop() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      setIsVisible(window.pageYOffset > 300);
    };

    window.addEventListener('scroll', toggleVisibility);
    return () => window.removeEventListener('scroll', toggleVisibility);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  if (!isVisible) return null;

  return (
    <Button
      onClick={scrollToTop}
      className={cn(
        "fixed bottom-4 left-4 z-40 w-12 h-12 rounded-full shadow-lg",
        "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
      )}
      aria-label="Back to top of page"
      data-testid="back-to-top"
    >
      <ArrowUp className="h-6 w-6" />
    </Button>
  );
}

/**
 * Accessibility-Enhanced Page Wrapper
 */
interface AccessiblePageProps {
  children: React.ReactNode;
  title: string;
  description?: string;
}

export function AccessiblePage({ children, title, description }: AccessiblePageProps) {
  useEffect(() => {
    // Announce page title to screen readers
    window.dispatchEvent(new CustomEvent('accessibility-announce', {
      detail: { 
        message: `Page loaded: ${title}${description ? `. ${description}` : ''}`, 
        priority: 'polite' 
      }
    }));
  }, [title, description]);

  return (
    <div className="focus-indicator-enhanced min-h-screen">
      <SkipNavigation />
      <ScreenReaderAnnouncements />
      
      <div id="main-content" role="main" tabIndex={-1}>
        <h1 className="sr-only">{title}</h1>
        {description && <p className="sr-only">{description}</p>}
        {children}
      </div>
      
      <AccessibilityToolbar />
      <BackToTop />
      <FocusIndicator />
    </div>
  );
}

// Utility function for components to announce to screen readers
export const announceToScreenReader = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
  window.dispatchEvent(new CustomEvent('accessibility-announce', {
    detail: { message, priority }
  }));
};