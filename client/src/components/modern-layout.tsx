import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ModernLayoutProps {
  children: ReactNode;
  sidebar?: ReactNode;
  className?: string;
}

export function ModernLayout({ children, sidebar, className }: ModernLayoutProps) {
  return (
    <div className={cn(
      "min-h-screen bg-background text-foreground font-sans antialiased",
      "flex flex-col lg:flex-row",
      className
    )}>
      {/* Sidebar */}
      {sidebar && (
        <aside className="w-full lg:w-80 lg:min-h-screen border-r border-border bg-card/50 backdrop-blur-sm">
          <div className="sticky top-0 h-auto lg:h-screen overflow-y-auto p-6">
            {sidebar}
          </div>
        </aside>
      )}
      
      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-screen">
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