import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PARTY_OPTIONS } from "@/lib/filter-codes";
import { describeListError, fetchList } from "@/lib/fetch-list";
import {
  composition, fetchMembers, filterMembers as applyMemberFilters, inCongress, latestCongress, memberPartyLabel,
  ordinal, partyCode, seatLabel, type CongressMemberRow,
} from "@/lib/congress-members";

interface Bill {
  congress?: number;
  number?: string;
  title?: string;
  latestAction?: { actionDate?: string; text?: string };
}

interface Committee {
  name?: string;
  systemCode?: string;
  chamber?: string;
}

/** Loading, error (with retry), empty, or the list itself — never an error body as data. */
function ListState<T>({ query, what, emptyText, children }: {
  query: { isLoading: boolean; error: unknown; data: T[] | undefined; refetch: () => unknown };
  what: string;
  emptyText: string;
  children: (rows: T[]) => React.ReactNode;
}) {
  if (query.isLoading) {
    return (
      <div className="space-y-3" aria-busy="true">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }
  if (query.error) {
    return (
      <div role="alert" className="text-center py-8 space-y-3">
        <p className="text-sm text-destructive">{describeListError(query.error, what)}</p>
        <Button variant="outline" size="sm" onClick={() => query.refetch()}>Try again</Button>
      </div>
    );
  }
  const rows = query.data ?? [];
  if (rows.length === 0) return <div className="text-center py-8 text-muted-foreground">{emptyText}</div>;
  return <>{children(rows)}</>;
}

// Light chips with dark text pass WCAG AA contrast in both themes.
const PARTY_CHIP: Record<string, string> = {
  D: 'border-transparent bg-blue-100 text-blue-800',
  R: 'border-transparent bg-red-100 text-red-800',
  I: 'border-transparent bg-gray-100 text-gray-800',
};

export function CongressData() {
  const [selectedCongress, setSelectedCongress] = useState("119");
  const [selectedState, setSelectedState] = useState("");
  
  // Filtering and search states
  const [memberSearch, setMemberSearch] = useState("");
  const [memberPartyFilter, setMemberPartyFilter] = useState("all");
  const [memberStateFilter, setMemberStateFilter] = useState("");
  const [memberChamberFilter, setMemberChamberFilter] = useState("all");
  
  const [billSearch, setBillSearch] = useState("");
  const [billStatusFilter, setBillStatusFilter] = useState("");
  
  const [committeeSearch, setCommitteeSearch] = useState("");
  const [committeeChamberFilter, setCommitteeChamberFilter] = useState("all");

  // Every list query goes through the typed loader: an error body (e.g. 503
  // missing_api_key from /api/bills/:congress) is an error state, never data.
  const billsQuery = useQuery({
    queryKey: ['/api/bills'],
    queryFn: ({ signal }) => fetchList<Bill>('/api/bills', signal, 'Bills'),
  });

  const congressNumber = /^\d{1,3}$/.test(selectedCongress.trim()) ? selectedCongress.trim() : "";
  const billsByCongressQuery = useQuery({
    queryKey: ['/api/bills', congressNumber],
    queryFn: ({ signal }) => fetchList<Bill>(`/api/bills/${congressNumber}`, signal, 'Bills by Congress'),
    enabled: !!congressNumber,
  });

  // A failed request is an error state, never an empty roster.
  const membersQuery = useQuery({
    queryKey: ['/api/members'],
    queryFn: ({ signal }) => fetchMembers('/api/members', signal),
  });
  // The server's default scope is its current roster; older builds returned every
  // Congress in the table, so the list is still limited to the roster's Congress.
  const congress = latestCongress(membersQuery.data ?? []);
  const members = membersQuery.data ? inCongress(membersQuery.data, congress) : undefined;

  // The server only accepts two-letter codes; don't send partial input.
  const stateCode = /^[A-Z]{2}$/.test(selectedState) ? selectedState : "";
  const membersByStateQuery = useQuery({
    queryKey: ['/api/members', stateCode],
    queryFn: ({ signal }) => fetchMembers(`/api/members/${stateCode}`, signal),
    enabled: !!stateCode
  });

  const committeesQuery = useQuery({
    queryKey: ['/api/committees'],
    queryFn: ({ signal }) => fetchList<Committee>('/api/committees', signal, 'Committees'),
  });

  // Filter functions
  const filterMembers = (membersList: CongressMemberRow[]) => applyMemberFilters(membersList, {
    search: memberSearch, party: memberPartyFilter, state: memberStateFilter, chamber: memberChamberFilter,
  });

  const filterBills = (billsList: Bill[]) => {
    return billsList.filter(bill => {
      const matchesSearch = !billSearch || 
        bill.title?.toLowerCase().includes(billSearch.toLowerCase()) ||
        bill.number?.toLowerCase().includes(billSearch.toLowerCase());
      
      const matchesStatus = !billStatusFilter || 
        bill.latestAction?.text?.toLowerCase().includes(billStatusFilter.toLowerCase());
      
      return matchesSearch && matchesStatus;
    });
  };

  const filterCommittees = (committeesList: Committee[]) => {
    return committeesList.filter(committee => {
      const matchesSearch = !committeeSearch || 
        committee.name?.toLowerCase().includes(committeeSearch.toLowerCase());
      
      const matchesChamber = !committeeChamberFilter || committeeChamberFilter === "all" ||
        committee.chamber?.toLowerCase().includes(committeeChamberFilter.toLowerCase());
      
      return matchesSearch && matchesChamber;
    });
  };

  const MembersList = ({ label, members, loading, error, onRetry, emptyText }: {
    label: string; members: CongressMemberRow[] | undefined; loading: boolean; error: unknown; onRetry: () => void; emptyText: string;
  }) => {
    if (loading) {
      return (
        <div className="space-y-3" aria-busy="true">
          {[...Array(10)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      );
    }
    if (error) {
      return (
        <div role="alert" className="text-center py-8 space-y-3">
          <p className="text-sm text-destructive">Member data could not be loaded, so no members are shown.</p>
          <Button variant="outline" size="sm" onClick={onRetry}>Try again</Button>
        </div>
      );
    }
    const all = members ?? [];
    if (all.length === 0) {
      return <div className="text-center py-8 text-muted-foreground">{emptyText}</div>;
    }
    const filteredMembers = filterMembers(all);
    // A native scroll region so keyboard users can focus and scroll the list.
    return (
      <div role="region" aria-label={`${label} list`} tabIndex={0}
        className="h-96 overflow-y-auto rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <div className="space-y-3 pr-1">
          <div className="text-sm text-muted-foreground mb-2">
            Showing {filteredMembers.length} of {all.length} members
          </div>
          {filteredMembers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No members found matching current filters
            </div>
          ) : (
            filteredMembers.map((member, i) => {
              const code = partyCode(member.party);
              return (
                <Card key={`${member.bioguideId || member.id || i}`} className="p-3">
                  <div className="flex justify-between items-center gap-2">
                    <div className="min-w-0">
                      <h4 className="font-semibold text-sm">{member.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {member.state} · {seatLabel(member)}
                      </p>
                      <p className="text-xs text-muted-foreground">{member.chamber}</p>
                    </div>
                    <Badge variant="outline" className={PARTY_CHIP[code] ?? 'bg-muted text-foreground'}>
                      {memberPartyLabel(member.party)}
                    </Badge>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </div>
    );
  };

  const counts = membersQuery.data ? composition(membersQuery.data, congress) : null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Congressional Data</h2>
        <p className="text-muted-foreground">Members, bills and committees of the U.S. Congress</p>
      </div>

      <Tabs defaultValue="members" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="bills">Bills</TabsTrigger>
          <TabsTrigger value="committees">Committees</TabsTrigger>
        </TabsList>

        <TabsContent value="members" className="space-y-4">
          {/* Filter Controls */}
          <Card>
            <CardHeader>
              <CardTitle>Filter Members</CardTitle>
              <CardDescription>Search and filter congressional members</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Input
                  placeholder="Search by name or ID..."
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                />
                <Select value={memberPartyFilter} onValueChange={setMemberPartyFilter}>
                  <SelectTrigger aria-label="Filter by party">
                    <SelectValue placeholder="Filter by party" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Parties</SelectItem>
                    {PARTY_OPTIONS.filter(o => ["D", "R", "I"].includes(o.value)).map(o => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  placeholder="State (e.g., CA, NY)"
                  value={memberStateFilter}
                  onChange={(e) => setMemberStateFilter(e.target.value.toUpperCase())}
                  maxLength={2}
                />
                <Select value={memberChamberFilter} onValueChange={setMemberChamberFilter}>
                  <SelectTrigger aria-label="Filter by chamber">
                    <SelectValue placeholder="Filter by chamber" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Chambers</SelectItem>
                    <SelectItem value="House">House</SelectItem>
                    <SelectItem value="Senate">Senate</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button 
                variant="outline" 
                onClick={() => {
                  setMemberSearch("");
                  setMemberPartyFilter("all");
                  setMemberStateFilter("");
                  setMemberChamberFilter("all");
                }}
              >
                Clear Filters
              </Button>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>All Members</CardTitle>
                <CardDescription>
                  {counts && counts.total > 0
                    ? `${ordinal(congress)} Congress: ${counts.senate} senators, ${counts.houseVoting} voting representatives, ${counts.houseNonVoting} nonvoting House members`
                      + (counts.total > counts.senate + counts.houseVoting + counts.houseNonVoting
                        ? `, ${counts.total - counts.senate - counts.houseVoting - counts.houseNonVoting} without a recognized seat` : "")
                    : "House and Senate members"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <MembersList
                  label="All members"
                  members={members}
                  loading={membersQuery.isLoading}
                  error={membersQuery.error}
                  onRetry={() => membersQuery.refetch()}
                  emptyText="No member records are loaded yet."
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Members by State</CardTitle>
                <CardDescription>Filter members by state</CardDescription>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g. CA"
                    aria-label="State code"
                    maxLength={2}
                    value={selectedState}
                    onChange={(e) => setSelectedState(e.target.value.toUpperCase())}
                    className="w-32"
                  />
                </div>
              </CardHeader>
              <CardContent>
                {stateCode ? (
                  <MembersList
                    label={`${stateCode} members`}
                    members={membersByStateQuery.data ? inCongress(membersByStateQuery.data, congress) : undefined}
                    loading={membersByStateQuery.isLoading}
                    error={membersByStateQuery.error}
                    onRetry={() => membersByStateQuery.refetch()}
                    emptyText={`No member records for ${stateCode}.`}
                  />
                ) : (
                  <div className="text-center py-8 text-muted-foreground">Enter a two-letter state code.</div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="bills" className="space-y-4">
          {/* Bill Filter Controls */}
          <Card>
            <CardHeader>
              <CardTitle>Filter Bills</CardTitle>
              <CardDescription>Search and filter congressional bills</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  placeholder="Search bills by title or number..."
                  value={billSearch}
                  onChange={(e) => setBillSearch(e.target.value)}
                />
                <Input
                  placeholder="Filter by status..."
                  value={billStatusFilter}
                  onChange={(e) => setBillStatusFilter(e.target.value)}
                />
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setBillSearch("");
                    setBillStatusFilter("");
                  }}
                >
                  Clear Filters
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Recent Bills</CardTitle>
                <CardDescription>Latest bills from Congress</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-96">
                  <ListState query={billsQuery} what="Bills" emptyText="No bills are recorded yet.">
                    {(bills) => (
                    <div className="space-y-3">
                      {filterBills(bills).slice(0, 20).map((bill, i) => (
                        <Card key={i} className="p-3">
                          <h4 className="font-semibold text-sm">{bill.title}</h4>
                          <p className="text-xs text-muted-foreground">
                            {bill.latestAction?.actionDate} - {bill.latestAction?.text}
                          </p>
                        </Card>
                      ))}
                    </div>
                    )}
                  </ListState>
                </ScrollArea>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Bills by Congress</CardTitle>
                <CardDescription>Filter bills by Congress number</CardDescription>
                <div className="flex gap-2">
                  <Input
                    placeholder="Congress number (e.g., 119, 118)"
                    aria-label="Congress number"
                    inputMode="numeric"
                    value={selectedCongress}
                    onChange={(e) => setSelectedCongress(e.target.value)}
                    className="w-64"
                  />
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setSelectedCongress(String(congress))}
                  >
                    Current ({ordinal(congress)})
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-96">
                  {!congressNumber ? (
                    <div className="text-center py-8 text-muted-foreground">Enter a Congress number, such as 119.</div>
                  ) : (
                  <ListState query={billsByCongressQuery} what="Bills by Congress" emptyText={`No bills are recorded for the ${ordinal(Number(congressNumber))} Congress.`}>
                    {(billsByCongress) => (
                    <div className="space-y-3">
                      {filterBills(billsByCongress).slice(0, 20).map((bill, i) => (
                        <Card key={i} className="p-3">
                          <h4 className="font-semibold text-sm">{bill.title}</h4>
                          <p className="text-xs text-muted-foreground">
                            Congress {bill.congress} - {bill.latestAction?.actionDate}
                          </p>
                        </Card>
                      ))}
                    </div>
                    )}
                  </ListState>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="committees" className="space-y-4">
          {/* Committee Filter Controls */}
          <Card>
            <CardHeader>
              <CardTitle>Filter Committees</CardTitle>
              <CardDescription>Search and filter congressional committees</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  placeholder="Search committees by name..."
                  value={committeeSearch}
                  onChange={(e) => setCommitteeSearch(e.target.value)}
                />
                <Select value={committeeChamberFilter} onValueChange={setCommitteeChamberFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by chamber" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Chambers</SelectItem>
                    <SelectItem value="House">House</SelectItem>
                    <SelectItem value="Senate">Senate</SelectItem>
                  </SelectContent>
                </Select>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setCommitteeSearch("");
                    setCommitteeChamberFilter("all");
                  }}
                >
                  Clear Filters
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>All Committees</CardTitle>
              <CardDescription>House and Senate committees</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <ListState query={committeesQuery} what="Committees" emptyText="No committees are recorded yet.">
                  {(committees) => (
                  <div className="space-y-3">
                    <div className="text-sm text-muted-foreground mb-2">
                      Showing {filterCommittees(committees).length} of {committees.length} committees
                    </div>
                    {filterCommittees(committees).map((committee, i) => (
                      <Card key={i} className="p-3">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h4 className="font-semibold text-sm">{committee.name}</h4>
                            <p className="text-xs text-muted-foreground">{committee.systemCode}</p>
                          </div>
                          <Badge variant={committee.chamber === 'House' ? 'default' : 'secondary'}>
                            {committee.chamber}
                          </Badge>
                        </div>
                      </Card>
                    ))}
                  </div>
                  )}
                </ListState>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}