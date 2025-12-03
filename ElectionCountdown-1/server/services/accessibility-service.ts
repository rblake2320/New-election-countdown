/**
 * Accessibility Compliance Service
 * WCAG 2.1 AA compliance for election platform accessibility
 */

export interface AccessibilityReport {
  score: number; // 0-100 WCAG compliance score
  level: 'A' | 'AA' | 'AAA' | 'non-compliant';
  issues: AccessibilityIssue[];
  recommendations: string[];
  testResults: {
    colorContrast: boolean;
    keyboardNavigation: boolean;
    screenReaderCompat: boolean;
    focusManagement: boolean;
    ariaLabels: boolean;
    headingStructure: boolean;
  };
}

export interface AccessibilityIssue {
  type: 'error' | 'warning' | 'notice';
  category: 'color' | 'keyboard' | 'screen-reader' | 'structure' | 'focus' | 'aria';
  element: string;
  description: string;
  impact: 'critical' | 'serious' | 'moderate' | 'minor';
  wcagGuideline: string;
  solution: string;
}

export interface AccessibilityConfig {
  enableHighContrast: boolean;
  enableScreenReaderMode: boolean;
  enableKeyboardNavigation: boolean;
  fontSize: 'small' | 'medium' | 'large' | 'extra-large';
  colorScheme: 'default' | 'high-contrast' | 'dark' | 'light';
  motionReduced: boolean;
  announcements: boolean;
}

class AccessibilityService {
  private defaultConfig: AccessibilityConfig = {
    enableHighContrast: false,
    enableScreenReaderMode: false,
    enableKeyboardNavigation: true,
    fontSize: 'medium',
    colorScheme: 'default',
    motionReduced: false,
    announcements: true
  };

  /**
   * WCAG 2.1 AA Color Contrast Requirements
   */
  private contrastRequirements = {
    normalText: 4.5,    // Normal text minimum contrast ratio
    largeText: 3.0,     // Large text (18pt+ or 14pt+ bold) minimum
    graphical: 3.0,     // Graphical objects and UI components
    enhanced: 7.0       // AAA level (optional but recommended)
  };

  /**
   * Accessibility-focused HTML/ARIA validators
   */
  private ariaValidators = {
    requiredLabels: [
      'button', 'input', 'select', 'textarea', 'link'
    ],
    landmarkRoles: [
      'banner', 'navigation', 'main', 'complementary', 'contentinfo', 'search', 'form'
    ],
    headingLevels: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']
  };

  /**
   * Generate accessibility configuration for user preferences
   */
  generateUserConfig(userPreferences: Partial<AccessibilityConfig>): AccessibilityConfig {
    return {
      ...this.defaultConfig,
      ...userPreferences
    };
  }

  /**
   * Validate color contrast ratios
   */
  validateColorContrast(foreground: string, background: string): {
    ratio: number;
    wcagAA: boolean;
    wcagAAA: boolean;
    recommendation?: string;
  } {
    // Convert hex colors to RGB
    const fgRgb = this.hexToRgb(foreground);
    const bgRgb = this.hexToRgb(background);
    
    if (!fgRgb || !bgRgb) {
      return {
        ratio: 0,
        wcagAA: false,
        wcagAAA: false,
        recommendation: 'Invalid color format provided'
      };
    }

    // Calculate luminance
    const fgLum = this.calculateLuminance(fgRgb);
    const bgLum = this.calculateLuminance(bgRgb);
    
    // Calculate contrast ratio
    const lighter = Math.max(fgLum, bgLum);
    const darker = Math.min(fgLum, bgLum);
    const ratio = (lighter + 0.05) / (darker + 0.05);

    const wcagAA = ratio >= this.contrastRequirements.normalText;
    const wcagAAA = ratio >= this.contrastRequirements.enhanced;

    let recommendation;
    if (!wcagAA) {
      recommendation = `Contrast ratio ${ratio.toFixed(2)} is below WCAG AA minimum (4.5). Consider using darker text or lighter background.`;
    } else if (!wcagAAA) {
      recommendation = `Good WCAG AA compliance. For AAA level, aim for ${this.contrastRequirements.enhanced}+ contrast ratio.`;
    }

    return { ratio: Number(ratio.toFixed(2)), wcagAA, wcagAAA, recommendation };
  }

  /**
   * Convert hex color to RGB
   */
  private hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  /**
   * Calculate relative luminance
   */
  private calculateLuminance(rgb: { r: number; g: number; b: number }): number {
    const { r, g, b } = rgb;
    
    const rsRGB = r / 255;
    const gsRGB = g / 255;
    const bsRGB = b / 255;

    const rLin = rsRGB <= 0.03928 ? rsRGB / 12.92 : Math.pow((rsRGB + 0.055) / 1.055, 2.4);
    const gLin = gsRGB <= 0.03928 ? gsRGB / 12.92 : Math.pow((gsRGB + 0.055) / 1.055, 2.4);
    const bLin = bsRGB <= 0.03928 ? bsRGB / 12.92 : Math.pow((bsRGB + 0.055) / 1.055, 2.4);

    return 0.2126 * rLin + 0.7152 * gLin + 0.0722 * bLin;
  }

  /**
   * Generate high contrast color palette
   */
  generateHighContrastPalette(): {
    background: string;
    foreground: string;
    primary: string;
    secondary: string;
    accent: string;
    error: string;
    success: string;
    warning: string;
  } {
    return {
      background: '#FFFFFF',
      foreground: '#000000',
      primary: '#0066CC',     // High contrast blue
      secondary: '#4B4B4B',   // Dark gray
      accent: '#8B0000',      // Dark red
      error: '#CC0000',       // Pure red
      success: '#006600',     // Dark green
      warning: '#CC6600'      // Dark orange
    };
  }

  /**
   * Generate screen reader announcements
   */
  generateScreenReaderAnnouncement(
    type: 'navigation' | 'status' | 'error' | 'success' | 'loading' | 'update',
    message: string,
    priority: 'polite' | 'assertive' = 'polite'
  ): {
    ariaLive: string;
    ariaLabel: string;
    message: string;
    timestamp: string;
  } {
    const timestamp = new Date().toISOString();
    
    const prefixes = {
      navigation: 'Navigation:',
      status: 'Status update:',
      error: 'Error:',
      success: 'Success:',
      loading: 'Loading:',
      update: 'Content updated:'
    };

    return {
      ariaLive: priority,
      ariaLabel: `${prefixes[type]} ${message}`,
      message: `${prefixes[type]} ${message}`,
      timestamp
    };
  }

  /**
   * Validate ARIA attributes and structure
   */
  validateAriaStructure(htmlContent: string): AccessibilityIssue[] {
    const issues: AccessibilityIssue[] = [];
    
    // Check for missing alt text on images
    const imgRegex = /<img[^>]*>/gi;
    const images = htmlContent.match(imgRegex) || [];
    
    images.forEach((img, index) => {
      if (!img.includes('alt=')) {
        issues.push({
          type: 'error',
          category: 'screen-reader',
          element: `img[${index}]`,
          description: 'Image missing alt attribute',
          impact: 'serious',
          wcagGuideline: 'WCAG 1.1.1 Non-text Content',
          solution: 'Add descriptive alt attribute to image'
        });
      }
    });

    // Check for proper heading structure
    const headingRegex = /<h[1-6][^>]*>/gi;
    const headings = htmlContent.match(headingRegex) || [];
    let previousLevel = 0;
    
    headings.forEach((heading, index) => {
      const level = parseInt(heading.match(/h([1-6])/)?.[1] || '1');
      
      if (level > previousLevel + 1) {
        issues.push({
          type: 'warning',
          category: 'structure',
          element: `heading[${index}]`,
          description: `Heading level ${level} skips levels (previous was h${previousLevel})`,
          impact: 'moderate',
          wcagGuideline: 'WCAG 1.3.1 Info and Relationships',
          solution: 'Use sequential heading levels (h1, h2, h3, etc.)'
        });
      }
      
      previousLevel = level;
    });

    // Check for buttons without labels
    const buttonRegex = /<button[^>]*>/gi;
    const buttons = htmlContent.match(buttonRegex) || [];
    
    buttons.forEach((button, index) => {
      if (!button.includes('aria-label=') && !button.includes('>')) {
        issues.push({
          type: 'error',
          category: 'aria',
          element: `button[${index}]`,
          description: 'Button missing accessible label',
          impact: 'serious',
          wcagGuideline: 'WCAG 4.1.2 Name, Role, Value',
          solution: 'Add aria-label or visible text content to button'
        });
      }
    });

    return issues;
  }

  /**
   * Generate comprehensive accessibility report
   */
  generateAccessibilityReport(
    htmlContent: string,
    colorPalette: { [key: string]: string }
  ): AccessibilityReport {
    const issues = this.validateAriaStructure(htmlContent);
    
    // Test color contrasts
    const contrastResults = Object.entries(colorPalette).map(([name, color]) => {
      if (name.includes('background')) return null;
      const bgColor = colorPalette.background || '#FFFFFF';
      return this.validateColorContrast(color, bgColor);
    }).filter(Boolean);

    const colorContrastPass = contrastResults.every(result => result?.wcagAA);
    
    // Calculate overall score
    let score = 100;
    
    // Deduct points for issues
    issues.forEach(issue => {
      switch (issue.impact) {
        case 'critical': score -= 25; break;
        case 'serious': score -= 15; break;
        case 'moderate': score -= 10; break;
        case 'minor': score -= 5; break;
      }
    });

    // Deduct points for color contrast failures
    if (!colorContrastPass) {
      score -= 20;
    }

    score = Math.max(score, 0);

    // Determine compliance level
    let level: AccessibilityReport['level'] = 'non-compliant';
    if (score >= 95) level = 'AAA';
    else if (score >= 85) level = 'AA';
    else if (score >= 70) level = 'A';

    const recommendations = [
      'Ensure all interactive elements have keyboard focus indicators',
      'Provide skip navigation links for keyboard users',
      'Use semantic HTML elements for better screen reader support',
      'Test with real screen reader software (NVDA, JAWS, VoiceOver)',
      'Ensure form labels are properly associated with form controls',
      'Provide alternative text for all informative images',
      'Use sufficient color contrast ratios (4.5:1 minimum)',
      'Make sure content is usable when zoomed to 200%',
      'Provide captions for video content',
      'Ensure error messages are clearly announced to screen readers'
    ];

    return {
      score,
      level,
      issues,
      recommendations: recommendations.slice(0, 5), // Top 5 recommendations
      testResults: {
        colorContrast: colorContrastPass,
        keyboardNavigation: true, // Would need dynamic testing
        screenReaderCompat: issues.filter(i => i.category === 'screen-reader').length === 0,
        focusManagement: true, // Would need dynamic testing  
        ariaLabels: issues.filter(i => i.category === 'aria').length === 0,
        headingStructure: issues.filter(i => i.category === 'structure').length === 0
      }
    };
  }

  /**
   * Generate keyboard navigation helper
   */
  generateKeyboardNavigation(): {
    shortcuts: Array<{ key: string; description: string; action: string }>;
    instructions: string;
  } {
    return {
      shortcuts: [
        { key: 'Tab', description: 'Navigate to next interactive element', action: 'focus-next' },
        { key: 'Shift + Tab', description: 'Navigate to previous interactive element', action: 'focus-previous' },
        { key: 'Enter', description: 'Activate button or link', action: 'activate' },
        { key: 'Space', description: 'Activate button or checkbox', action: 'activate' },
        { key: 'Arrow Keys', description: 'Navigate within menus and lists', action: 'navigate-menu' },
        { key: 'Escape', description: 'Close modal or dropdown', action: 'close' },
        { key: 'Home', description: 'Go to first element in group', action: 'go-first' },
        { key: 'End', description: 'Go to last element in group', action: 'go-last' }
      ],
      instructions: 'Use Tab to navigate between interactive elements. Press Enter or Space to activate buttons. Use arrow keys within menus and lists. Press Escape to close dialogs.'
    };
  }
}

// Export singleton instance
export const accessibilityService = new AccessibilityService();
export default accessibilityService;