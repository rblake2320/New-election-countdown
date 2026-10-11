import { useState, useMemo, useEffect } from "react";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, SlidersHorizontal, Grid3X3, List, Loader2, Users, User, LogOut } from "lucide-react";
import { PageHead, pageMetadata } from "@/components/page-head";
import { MobileContainer, ResponsiveGrid, useIsMobile, MobileNavigation } from "@/components/mobile-responsive-layout";
import FilterSidebar from "@/components/filter-sidebar-new";
import { ElectionCard } from "@/components/election-card";
import ElectionGrid from "@/components/ElectionGrid";
import { VoterInfoLookup } from "@/components/voter-info-lookup";
import { AIElectionSearch } from "@/components/ai-election-search";
// import { AuthModal } from "@/components/auth-modal";
import { UserWatchlist } from "@/components/user-watchlist";
import { VersionSwitcher } from "@/components/version-switcher";
import { WatchlistSyncPrompt } from "@/components/WatchlistSyncPrompt";
import { DataStewardStatusCard } from "@/components/data-steward-status-card";
import { FilterGuidancePanel } from "@/components/filter-guidance-panel";
import { useFilterGuidance } from "@/hooks/use-filter-guidance";
import { useElections, useElectionStats } from "@/hooks/use-elections";
import { useAuth } from "@/hooks/use-auth";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useIsAdmin } from "@/lib/useIsAdmin";
import { type ElectionFilters } from "@shared/schema";
import { readHomeUrl, writeHomeUrl } from "@/lib/url-state";
import { normalizeFilters, isUpcomingTimeframe, levelLabel, partyLabel, timeframeLabel } from "@/lib/filter-codes";
import { isUpcomingElection } from "@/lib/election-timing";
import { useNow } from "@/hooks/use-now";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

export default function Home() {
  const queryClient = useQueryClient();
  const [storedFilters, setFilters] = useLocalStorage<ElectionFilters>("election-filters", {
    state: undefined,
    type: undefined,
    level: undefined,
    timeframe: undefined,
    timeRange: undefined,
    party: undefined,
    electionType: undefined,
    search: undefined
  });
  // The URL wins over saved filters, so links and Back restore exactly what
  // the visitor was looking at (ET-29). Read once on mount.
  const [initialUrl] = useState(() => readHomeUrl(typeof window !== "undefined" ? window.location.search : ""));
  const [urlApplied, setUrlApplied] = useState(!initialUrl.present);
  useEffect(() => {
    if (!initialUrl.present) return;
    setFilters(prev => ({ ...prev, state: undefined, level: undefined, party: undefined, electionType: undefined, type: undefined, timeframe: undefined, ...initialUrl.filters }));
    setUrlApplied(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // Older builds stored display labels ("Federal", "Democratic"); map them to API codes.
  const filters = useMemo(() => normalizeFilters(urlApplied ? storedFilters : (initialUrl.filters as ElectionFilters)), [storedFilters, urlApplied, initialUrl]);
  const [searchQuery, setSearchQuery] = useState(initialUrl.q ?? "");
  const [viewMode, setViewMode] = useState<"grid" | "list">(initialUrl.view ?? "grid");

  // Remember the scroll position per URL so Back from an election lands where the
  // visitor left; restored once the (virtualized) list has data to lay out.
  useEffect(() => {
    let raf = 0;
    const save = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => {
      try { sessionStorage.setItem(`home-scroll:${window.location.search}`, String(Math.round(window.scrollY))); } catch { /* storage blocked */ }
    }); };
    window.addEventListener("scroll", save, { passive: true });
    return () => { window.removeEventListener("scroll", save); cancelAnimationFrame(raf); };
  }, []);

  // Keep the URL in step (replace, not push: typing should not fill history).
  useEffect(() => {
    const next = window.location.pathname + writeHomeUrl({ q: searchQuery, filters, view: viewMode });
    if (next !== window.location.pathname + window.location.search) window.history.replaceState(window.history.state, "", next);
  }, [searchQuery, filters, viewMode]);
  const [dismissedGuidance, setDismissedGuidance] = useState<Set<string>>(new Set());
  // const [showAuthModal, setShowAuthModal] = useState(false);
  const { user, isAuthenticated, isLoading: authLoading, logout } = useAuth();
  const isAdmin = useIsAdmin(user || undefined);
  
  const queryFilters = useMemo(() => ({
    state: filters.state,
    type: filters.type,
    level: filters.level,
    timeframe: filters.timeframe,
    timeRange: filters.timeRange,
    electionType: filters.electionType,
    party: filters.party,
    search: searchQuery || undefined,
  }), [filters, searchQuery]);
  
  const { data: fetchedElections = [], isLoading, error } = useElections(queryFilters);
  // Re-evaluated every minute so races drop off at midnight in their own zone
  // without waiting for a refetch or filter change.
  const minuteClock = useNow(60_000);
  const [scrollRestored, setScrollRestored] = useState(false);
  useEffect(() => {
    if (scrollRestored || isLoading || fetchedElections.length === 0) return;
    setScrollRestored(true);
    let y = 0;
    try { y = Number(sessionStorage.getItem(`home-scroll:${window.location.search}`) || 0); } catch { /* storage blocked */ }
    if (y <= 0) return;
    // The virtualized list grows over a few frames; scrolling before the page is
    // tall enough gets clamped. Try each frame for up to ~1.5 s.
    let tries = 0;
    const attempt = () => {
      const tallEnough = document.documentElement.scrollHeight >= y + window.innerHeight;
      if (tallEnough || tries++ > 90) { window.scrollTo(0, y); return; }
      requestAnimationFrame(attempt);
    };
    requestAnimationFrame(attempt);
  }, [scrollRestored, isLoading, fetchedElections.length]);
  // "Next N days" must never show a race whose date has already passed.
  const elections = useMemo(() => {
    if (!isUpcomingTimeframe(filters.timeframe)) return fetchedElections;
    const now = new Date(minuteClock);
    return fetchedElections.filter(e => isUpcomingElection(e, now));
  }, [fetchedElections, filters.timeframe, minuteClock]);
  
  // Filter guidance system
  const { 
    issues: guidanceIssues, 
    guidanceEnabled, 
    setGuidanceEnabled 
  } = useFilterGuidance(filters);
  
  
  const { data: stats } = useElectionStats();
  const activeFilterCount = [filters.state, filters.timeframe].filter(Boolean).length
    + [filters.level, filters.party, filters.electionType].reduce((n, v) => n + (v ? [v].flat().length : 0), 0);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    // Invalidate elections cache to force fresh data fetch
    queryClient.invalidateQueries({ queryKey: ['/api/elections'] });
  };

  const handleFiltersChange = (newFilters: ElectionFilters) => {
    setFilters(newFilters);
    // Invalidate elections cache to force fresh data fetch
    queryClient.invalidateQueries({ queryKey: ['/api/elections'] });
  };

  const removeFilter = (filterType: keyof ElectionFilters, value?: string) => {
    const newFilters: ElectionFilters = { ...filters, [filterType]: undefined };
    setFilters(newFilters);
    // Invalidate elections cache to force fresh data fetch
    queryClient.invalidateQueries({ queryKey: ['/api/elections'] });
  };
  
  const handleApplyGuidanceSuggestion = (suggestedFilters: Partial<ElectionFilters>) => {
    const newFilters = { ...filters, ...suggestedFilters };
    setFilters(newFilters);
    queryClient.invalidateQueries({ queryKey: ['/api/elections'] });
  };
  
  const handleDismissGuidance = () => {
    // Create a key based on current filter state to dismiss this specific guidance
    const guidanceKey = `${filters.state || 'none'}-${[filters.level ?? []].flat().join(',')}`;
    setDismissedGuidance(prev => new Set(prev).add(guidanceKey));
  };
  
  // Filter out dismissed guidance issues
  const activeGuidanceIssues = guidanceIssues.filter(issue => {
    const guidanceKey = `${filters.state || 'none'}-${[filters.level ?? []].flat().join(',')}`;
    return !dismissedGuidance.has(guidanceKey);
  });

  const activeFiltersCount = Object.values(filters).filter(Boolean).length;

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center">
            <Grid3X3 className="h-8 w-8 text-destructive" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-foreground">Unable to Load Elections</h2>
            <p className="text-muted-foreground">
              We're having trouble connecting to our election data services. This might be temporary.
            </p>
          </div>
          <div className="space-y-3">
            <h3 className="font-semibold text-foreground">What you can try:</h3>
            <div className="space-y-2 text-sm text-muted-foreground text-left">
              <div className="flex items-start gap-2">
                <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></span>
                <span>Check your internet connection and try refreshing the page</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></span>
                <span>Visit our Congress tracker or other features while we restore election data</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0"></span>
                <span>Our system typically recovers within a few minutes</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button onClick={() => window.location.reload()} className="flex-1" data-testid="error-refresh-button">
              <Loader2 className="mr-2 h-4 w-4" />
              Try Again
            </Button>
            <Link href="/congress" className="flex-1">
              <Button variant="outline" className="w-full" data-testid="error-congress-button">
                <Users className="mr-2 h-4 w-4" />
                View Congress
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <PageHead {...pageMetadata.home} />
      <MobileContainer className="min-h-screen bg-background">
        {/* Header */}
        <header className="bg-card border-b border-border sticky top-0 z-50 shadow-sm">
          <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="hidden lg:flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold">E</span>
                </div>
                <h1 className="text-xl font-bold">ElectionTracker</h1>
              </div>
            </div>
            
            <div className="flex flex-1 lg:flex-none items-center justify-end gap-2 sm:gap-4 min-w-0">
              <div className="relative flex-1 lg:flex-none min-w-0">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search elections, candidates..."
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="w-full lg:w-64 pl-10"
                  aria-label="Search elections and candidates"
                />
              </div>
              <Link href="/congress" className="hidden sm:inline-flex">
                <Button variant="outline" size="sm">
                  <Users className="h-4 w-4 mr-1" />
                  Congress
                </Button>
              </Link>
              
              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <User className="h-4 w-4 mr-1" />
                      {user.email?.split('@')[0] || 'User'}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => logout()}>
                      <LogOut className="h-4 w-4 mr-2" />
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Link href="/auth">
                  <Button 
                    variant="outline" 
                    size="sm"
                    aria-label="Sign in"
                  >
                    <User className="h-4 w-4 sm:mr-1" />
                    <span className="hidden sm:inline">Sign In</span>
                  </Button>
                </Link>
              )}

            </div>
          </div>
          </div>
        </header>

        <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col lg:flex-row gap-6 w-full">
          
          {/* Filter Sidebar */}
          <aside className="order-2 lg:order-1 w-full lg:w-72 xl:w-80 space-y-6 flex-shrink-0">
            <VersionSwitcher compact={false} />
            {isAdmin && <DataStewardStatusCard />}
            <div className="hidden lg:block">
              <FilterSidebar 
                filters={filters}
                onFiltersChange={handleFiltersChange}
              />
            </div>
            <VoterInfoLookup />
            <UserWatchlist />
            {/* Operator tooling (AI search + "Find All Missing Elections", which POSTs a
                data expansion) competed with the voter search: admins only (ET-30). */}
            {isAdmin && <AIElectionSearch />}
          </aside>

          {/* Main Content */}
          <main className="order-1 lg:order-2 flex-1 min-w-0">
            <WatchlistSyncPrompt />
            
            {/* Filter Guidance Panel */}
            <FilterGuidancePanel
              issues={activeGuidanceIssues}
              onApplySuggestion={handleApplyGuidanceSuggestion}
              onDismiss={handleDismissGuidance}
              guidanceEnabled={guidanceEnabled}
              onToggleGuidance={setGuidanceEnabled}
            />
            
            {/* No separate Featured block: it repeated the first races of the list and
                pushed the result count far down. Owner decision 2026-10-11: results
                first on every screen size (ET-30). */}

            {/* Dashboard Header */}
            <div style={{ marginBottom: 'var(--section-spacing)' }}>
              <div className="flex flex-wrap items-center justify-between gap-3" style={{ marginBottom: 'var(--content-spacing)' }}>
                <div>
                  <h2 className="text-2xl font-bold">{isUpcomingTimeframe(filters.timeframe) ? "Upcoming Elections" : "All Elections"}</h2>
                  <p className="text-muted-foreground">
                    {isLoading ? (
                      "Loading elections..."
                    ) : (
                      // Count describes the same query as the heading (owner UX review):
                      // not "of 537", which mixed past races into an upcoming list.
                      `${elections.length} ${isUpcomingTimeframe(filters.timeframe) ? "upcoming " : ""}election${elections.length === 1 ? "" : "s"}${searchQuery.trim() ? ` matching "${searchQuery.trim()}"` : ""}`
                    )}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Sheet>
                    <SheetTrigger asChild>
                      <Button variant="outline" size="sm" className="lg:hidden">
                        <SlidersHorizontal className="h-4 w-4 mr-1" />
                        Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
                      </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="w-80 max-w-[85vw] overflow-y-auto p-4">
                      <SheetTitle className="sr-only">Filters</SheetTitle>
                      <FilterSidebar filters={filters} onFiltersChange={handleFiltersChange} />
                    </SheetContent>
                  </Sheet>
                  <Button
                    variant={viewMode === "grid" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setViewMode("grid")}
                  >
                    <Grid3X3 className="h-4 w-4 mr-1" />
                    Grid
                  </Button>
                  <Button
                    variant={viewMode === "list" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setViewMode("list")}
                  >
                    <List className="h-4 w-4 mr-1" />
                    List
                  </Button>
                </div>
              </div>
              
              {/* Active Filters Display */}
              {activeFiltersCount > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {filters.timeframe && (
                    <Badge variant="secondary" className="gap-1">
                      Time: {timeframeLabel(filters.timeframe)}
                      <button 
                        onClick={() => removeFilter('timeframe')}
                        className="ml-1 hover:bg-muted-foreground/20 rounded-full p-0.5"
                      >
                        ×
                      </button>
                    </Badge>
                  )}
                  {filters.state && filters.state !== 'all' && (
                    <Badge variant="secondary" className="gap-1">
                      State: {filters.state}
                      <button 
                        onClick={() => removeFilter('state')}
                        className="ml-1 hover:bg-muted-foreground/20 rounded-full p-0.5"
                      >
                        ×
                      </button>
                    </Badge>
                  )}
                  {filters.type && (
                    <Badge variant="secondary" className="gap-1">
                      Type: {filters.type}
                      <button 
                        onClick={() => removeFilter('type')}
                        className="ml-1 hover:bg-muted-foreground/20 rounded-full p-0.5"
                      >
                        ×
                      </button>
                    </Badge>
                  )}
                  {filters.level && (
                    <Badge variant="secondary" className="gap-1">
                      Level: {[filters.level].flat().map(levelLabel).join(", ")}
                      <button 
                        onClick={() => removeFilter('level')}
                        className="ml-1 hover:bg-muted-foreground/20 rounded-full p-0.5"
                      >
                        ×
                      </button>
                    </Badge>
                  )}
                  {filters.party && (
                    <Badge variant="secondary" className="gap-1">
                      Party: {[filters.party].flat().map(partyLabel).join(", ")}
                      <button 
                        onClick={() => removeFilter('party')}
                        className="ml-1 hover:bg-muted-foreground/20 rounded-full p-0.5"
                      >
                        ×
                      </button>
                    </Badge>
                  )}
                </div>
              )}
            </div>

            {/* Elections Grid/List */}
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span className="ml-2">Loading elections...</span>
              </div>
            ) : elections.length === 0 ? (
              <div className="text-center py-12">
                <h3 className="text-lg font-semibold mb-2">No Elections Found</h3>
                <p className="text-muted-foreground mb-4">
                  Try adjusting your filters or search criteria to find elections.
                </p>
                <Button onClick={() => setFilters({
                  state: undefined,
                  type: undefined,
                  level: undefined,
                  timeframe: undefined,
                  timeRange: undefined,
                  party: undefined,
                  electionType: undefined,
                  search: undefined
                })}>Clear All Filters</Button>
              </div>
            ) : (
              <ElectionGrid data={elections} viewMode={viewMode} />
            )}

          </main>
        </div>
      </div>
      </MobileContainer>
    </>
  );
}
