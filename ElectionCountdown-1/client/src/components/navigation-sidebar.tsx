import * as React from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Home, Users, Building2, BarChart3, Radio, Globe, Database, Calendar, Shield, Package, User, LogOut, ChevronDown, ChevronRight, Building, Settings, BarChart2, Archive, HelpCircle } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useState } from "react";

const navigationSections = [
  {
    id: "explore",
    label: "🏛️ Explore",
    icon: Archive,
    description: "Browse elections and congressional information",
    items: [
      { 
        label: "Elections", 
        path: "/", 
        icon: Home, 
        tooltip: "Browse federal, state, and local elections with countdown timers and candidate information"
      },
      { 
        label: "Congress", 
        path: "/congress", 
        icon: Users, 
        tooltip: "View current Congress members, track voting records, and monitor legislative activity"
      },
    ]
  },
  {
    id: "portals", 
    label: "🚪 Portals",
    icon: Building,
    description: "Specialized access for campaigns and candidates",
    items: [
      { 
        label: "Campaign Portal", 
        path: "/campaign-portal", 
        icon: Building2, 
        tooltip: "Professional tools for campaign management, voter outreach, and election resources"
      },
      { 
        label: "Candidate Portal", 
        path: "/candidate-portal", 
        icon: Shield, 
        tooltip: "Register as a candidate, manage your profile, and access campaign support tools"
      },
    ]
  },
  {
    id: "data-tools",
    label: "📊 Data Tools", 
    icon: BarChart2,
    description: "Advanced analytics and monitoring capabilities",
    items: [
      { 
        label: "Real-Time Monitor", 
        path: "/monitoring", 
        icon: Radio, 
        tooltip: "Live dashboard showing election updates, system health, and real-time data feeds"
      },
      { 
        label: "Data Steward", 
        path: "/data-steward", 
        icon: Shield, 
        tooltip: "AI-powered data validation system that monitors integrity, detects issues, and auto-fixes problems"
      },
      { 
        label: "Civic Data APIs", 
        path: "/civic", 
        icon: Database, 
        tooltip: "Access to government APIs, data aggregation tools, and civic information services"
      },
    ]
  },
  {
    id: "admin",
    label: "⚙️ Admin",
    icon: Settings,
    description: "Administrative tools and global oversight",
    items: [
      { 
        label: "Congress Admin", 
        path: "/congress-admin", 
        icon: BarChart3, 
        tooltip: "Administrative interface for managing congressional data, member information, and legislative tracking"
      },
      { 
        label: "Global Observatory", 
        path: "/global", 
        icon: Globe, 
        tooltip: "Worldwide election monitoring, international democratic processes, and global election calendar"
      },
    ]
  }
];

// Secondary navigation items (shown conditionally)
const secondaryItems = [
  { 
    label: "2026 Midterms", 
    path: "/2026", 
    icon: Calendar, 
    tooltip: "Preview the 2026 midterm elections with 545+ offices up for election including Congress, Governors, and major cities"
  },
];

export function NavigationSidebar() {
  const [location, setLocation] = useLocation();
  const { user, isAuthenticated, logout } = useAuth();
  const [openSections, setOpenSections] = useState<string[]>(['explore', 'portals', 'data-tools', 'admin']);

  const toggleSection = (sectionId: string) => {
    setOpenSections(prev => 
      prev.includes(sectionId) 
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const isPathInSection = (section: typeof navigationSections[0]) => {
    return section.items.some(item => location === item.path);
  };

  return (
    <div className="space-y-2">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-foreground">Navigation</h2>
      </div>
      
      {/* Auth section */}
      <div className="mb-4 pb-4 border-b">
        {isAuthenticated ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 px-3 py-2 text-sm">
              <User className="h-4 w-4" />
              <span className="truncate">{user?.email}</span>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full justify-start gap-2"
              onClick={() => {
                logout();
                setLocation('/');
              }}
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </div>
        ) : (
          <Link href="/auth">
            <Button variant="default" size="sm" className="w-full">
              Sign In / Sign Up
            </Button>
          </Link>
        )}
      </div>
      <nav className="space-y-2" data-testid="main-navigation">
        {navigationSections.map((section) => {
          const isOpen = openSections.includes(section.id);
          const hasActiveItem = isPathInSection(section);
          
          return (
            <Collapsible
              key={section.id}
              open={isOpen}
              onOpenChange={() => toggleSection(section.id)}
              data-testid={`nav-section-${section.id}`}
            >
              <CollapsibleTrigger className="flex items-center justify-between w-full px-3 py-2 text-left hover:bg-accent rounded-md transition-colors" data-testid={`nav-section-header-${section.id}`}>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-foreground">
                    {section.label}
                  </span>
                </div>
                {isOpen ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </CollapsibleTrigger>
              
              <CollapsibleContent className="space-y-1 pl-3 pr-3 pb-2" data-testid={`nav-section-content-${section.id}`}>
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = location === item.path;
                  
                  return (
                    <Tooltip key={item.path} delayDuration={300}>
                      <TooltipTrigger asChild>
                        <Link
                          href={item.path}
                          className={cn(
                            "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-200",
                            "hover:bg-accent hover:text-accent-foreground",
                            isActive 
                              ? "bg-primary text-primary-foreground shadow-sm" 
                              : "text-muted-foreground hover:text-foreground"
                          )}
                          data-testid={`nav-link-${item.path.replace('/', 'home')}`}
                        >
                          <Icon className="h-4 w-4 flex-shrink-0" />
                          <span className="truncate">{item.label}</span>
                        </Link>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="max-w-xs">
                        <p>{item.tooltip}</p>
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </CollapsibleContent>
            </Collapsible>
          );
        })}
        
        {/* Secondary Navigation */}
        {secondaryItems.length > 0 && (
          <div className="pt-2 mt-2 border-t border-border" data-testid="secondary-navigation">
            <div className="px-3 py-1">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Quick Access</span>
            </div>
            <div className="space-y-1">
              {secondaryItems.map((item) => {
                const Icon = item.icon;
                const isActive = location === item.path;
                
                return (
                  <Tooltip key={item.path} delayDuration={300}>
                    <TooltipTrigger asChild>
                      <Link
                        href={item.path}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-200",
                          "hover:bg-accent hover:text-accent-foreground",
                          isActive 
                            ? "bg-primary text-primary-foreground shadow-sm" 
                            : "text-muted-foreground hover:text-foreground"
                        )}
                        data-testid={`nav-secondary-link-${item.path.replace('/', 'home')}`}
                      >
                        <Icon className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate">{item.label}</span>
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-xs">
                      <p>{item.tooltip}</p>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          </div>
        )}
      </nav>
    </div>
  );
}