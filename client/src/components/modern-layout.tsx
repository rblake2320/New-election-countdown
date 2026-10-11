import { ReactNode, useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

interface ModernLayoutProps {
  children: ReactNode;
  sidebar?: ReactNode;
  className?: string;
}

export function ModernLayout({ children, sidebar, className }: ModernLayoutProps) {
  // Below lg the sidebar lives in a drawer; it used to stack full-width above
  // the page, so phones opened on a screen of navigation instead of elections.
  const [navOpen, setNavOpen] = useState(false);
  const [location] = useLocation();
  useEffect(() => setNavOpen(false), [location]);

  return (
    <div className={cn(
      "min-h-screen bg-background text-foreground font-sans antialiased",
      "flex flex-col lg:flex-row",
      className
    )}>
      {/* Sidebar */}
      {sidebar && (
        <>
          <div className="lg:hidden sticky top-0 z-40 flex items-center gap-3 border-b border-border bg-background/95 backdrop-blur px-4 h-14">
            <Sheet open={navOpen} onOpenChange={setNavOpen}>
              <SheetTrigger
                className="inline-flex h-10 w-10 items-center justify-center rounded-md hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Open navigation"
              >
                <Menu className="h-5 w-5" />
              </SheetTrigger>
              <SheetContent side="left" className="w-80 max-w-[85vw] overflow-y-auto p-6">
                <SheetTitle className="sr-only">Navigation</SheetTitle>
                {sidebar}
              </SheetContent>
            </Sheet>
            <span className="font-semibold">ElectionTracker</span>
          </div>
          <aside className="hidden lg:block lg:w-64 xl:w-72 shrink-0 lg:min-h-screen border-r border-border bg-card/50 backdrop-blur-sm">
            <div className="sticky top-0 h-screen overflow-y-auto p-6">
              {sidebar}
            </div>
          </aside>
        </>
      )}
      
      {/* Main Content */}
      <main className="flex-1 min-w-0 flex flex-col min-h-screen">
        <div className="flex-1 overflow-y-auto">
          <div className="w-full max-w-none">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}

export function ModernCard({ 
  children, 
  className,
  hover = true,
  ...props 
}: {
  children: ReactNode;
  className?: string;
  hover?: boolean;
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "relative rounded-2xl border border-border-subtle bg-surface-0/80 backdrop-blur-xs",
        "shadow-lg transition-all duration-200",
        hover && "hover:shadow-2xl hover:scale-[1.02]",
        className
      )}
      style={{ contain: 'layout style paint' }}
      {...props}
    >
      {children}
    </div>
  );
}

export function ModernHeader({ 
  title, 
  subtitle, 
  actions,
  className 
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-between", className)}>
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-app-fg">
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm text-text-muted">
            {subtitle}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-3">
          {actions}
        </div>
      )}
    </div>
  );
}