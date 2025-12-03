import { Link, useLocation } from "wouter";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";

interface BreadcrumbItem {
  label: string;
  href?: string;
  current?: boolean;
}

interface BreadcrumbNavProps {
  items?: BreadcrumbItem[];
  className?: string;
}

// Define page titles and breadcrumb structures
const pageBreadcrumbs: Record<string, BreadcrumbItem[]> = {
  "/": [
    { label: "Elections", current: true }
  ],
  "/congress": [
    { label: "Elections", href: "/" },
    { label: "Congress", current: true }
  ],
  "/campaign-portal": [
    { label: "Elections", href: "/" },
    { label: "Campaign Portal", current: true }
  ],
  "/candidate-portal": [
    { label: "Elections", href: "/" },
    { label: "Candidate Portal", current: true }
  ],
  "/monitoring": [
    { label: "Elections", href: "/" },
    { label: "Data Tools" },
    { label: "Real-Time Monitor", current: true }
  ],
  "/data-steward": [
    { label: "Elections", href: "/" },
    { label: "Data Tools" },
    { label: "Data Steward", current: true }
  ],
  "/civic": [
    { label: "Elections", href: "/" },
    { label: "Data Tools" },
    { label: "Civic Data APIs", current: true }
  ],
  "/congress-admin": [
    { label: "Elections", href: "/" },
    { label: "Admin" },
    { label: "Congress Admin", current: true }
  ],
  "/global": [
    { label: "Elections", href: "/" },
    { label: "Admin" },
    { label: "Global Observatory", current: true }
  ],
  "/2026": [
    { label: "Elections", href: "/" },
    { label: "2026 Midterms", current: true }
  ],
  "/auth": [
    { label: "Elections", href: "/" },
    { label: "Sign In", current: true }
  ]
};

export function BreadcrumbNav({ items, className }: BreadcrumbNavProps) {
  const [location] = useLocation();
  
  // Use provided items or auto-generate from current location
  const breadcrumbItems = items || pageBreadcrumbs[location] || [
    { label: "Elections", href: "/" },
    { label: "Page", current: true }
  ];

  return (
    <nav 
      className={cn("flex items-center space-x-1 text-sm text-muted-foreground", className)}
      aria-label="Breadcrumb"
      data-testid="breadcrumb-nav"
    >
      <Home className="h-4 w-4" />
      {breadcrumbItems.map((item, index) => (
        <div key={index} className="flex items-center space-x-1">
          {index > 0 && <ChevronRight className="h-4 w-4" />}
          {item.current ? (
            <span 
              className="font-medium text-foreground"
              aria-current="page"
              data-testid={`breadcrumb-current`}
            >
              {item.label}
            </span>
          ) : item.href && item.href !== "#" ? (
            <Link 
              href={item.href}
              className="hover:text-foreground transition-colors"
              data-testid={`breadcrumb-link-${index}`}
            >
              {item.label}
            </Link>
          ) : (
            <span className="text-muted-foreground">{item.label}</span>
          )}
        </div>
      ))}
    </nav>
  );
}

// Page title component that shows context
interface PageTitleProps {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
  showBreadcrumbs?: boolean;
  className?: string;
}

export function PageTitle({ 
  title, 
  subtitle, 
  children, 
  showBreadcrumbs = true, 
  className 
}: PageTitleProps) {
  return (
    <div className={cn("space-y-4", className)} data-testid="page-title">
      {showBreadcrumbs && <BreadcrumbNav />}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-foreground" data-testid="page-title-heading">
            {title}
          </h1>
          {children}
        </div>
        {subtitle && (
          <p className="text-muted-foreground" data-testid="page-title-subtitle">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}