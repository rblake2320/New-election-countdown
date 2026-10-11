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
import {
  composition, fetchMembers, filterMembers as applyMemberFilters, inCongress, latestCongress, memberPartyLabel,
  ordinal, partyCode, seatLabel, type CongressMemberRow,
} from "@/lib/congress-members";

// Light chips with dark text pass WCAG AA contrast in both themes.
const PARTY_CHIP: Record<string, string> = {
  D: 'border-transparent bg-blue-100 text-blue-800',
  R: 'border-transparent bg-red-100 text-red-800',
  I: 'border-transparent bg-gray-100 text-gray-800',
};

export function CongressData() {
  const [selectedCongress, setSelectedCongress] = useState("119");
  const [selectedState, setSelectedState] = useState("");
  const [selectedChamber, setSelectedChamber] = useState("house");
  const [selectedCommitteeCode, setSelectedCommitteeCode] = useState("");
  
  // Filtering and search states
  const [memberSearch, setMemberSearch] = useState("");
  const [memberPartyFilter, setMemberPartyFilter] = useState("all");
  const [memberStateFilter, setMemberStateFilter] = useState("");
  const [memberChamberFilter, setMemberChamberFilter] = useState("all");
  
  const [billSearch, setBillSearch] = useState("");
  const [billStatusFilter, setBillStatusFilter] = useState("");
  
  const [committeeSearch, setCommitteeSearch] = useState("");
  const [committeeChamberFilter, setCommitteeChamberFilter] = useState("all");

  // API queries
  const { data: bills, isLoading: billsLoading } = useQuery({
    queryKey: ['/api/bills'],
    queryFn: async () => {
      const response = await fetch('/api/bills');
      return response.json();
    }
  });

  const { data: billsByCongress, isLoading: billsByCongressLoading } = useQuery({
    queryKey: ['/api/bills', selectedCongress],
    queryFn: async () => {
      const response = await fetch(`/api/bills/${selectedCongress}`);
      return response.json();
    }
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

  const { data: committees, isLoading: committeesLoading } = useQuery({
    queryKey: ['/api/committees'],
    queryFn: async () => {
      const response = await fetch('/api/committees');
      return response.json();
    }
  });

  const { data: committeeMembers, isLoading: committeeMembersLoading } = useQuery({
    queryKey: ['/api/committees', selectedChamber, selectedCommitteeCode, 'members'],
    queryFn: async () => {
      const response = await fetch(`/api/committees/${selectedChamber}/${selectedCommitteeCode}/members`);
      return response.json();
    },
    enabled: !!selectedChamber && !!selectedCommitteeCode
  });

  // Filter functions
  const filterMembers = (membersList: CongressMemberRow[]) => applyMemberFilters(membersList, {
    search: memberSearch, party: memberPartyFilter, state: memberStateFilter, chamber: memberChamberFilter,
  });

  const filterBills = (billsList: any[]) => {
    return billsList?.filter(bill => {
      const matchesSearch = !billSearch || 
        bill.title?.toLowerCase().includes(billSearch.toLowerCase()) ||
        bill.number?.toLowerCase().includes(billSearch.toLowerCase());
      
      const matchesStatus = !billStatusFilter || 
        bill.latestAction?.text?.toLowerCase().includes(billStatusFilter.toLowerCase());
      
      return matchesSearch && matchesStatus;
    }) || [];
  };

  const filterCommittees = (committeesList: any[]) => {
    return committeesList?.filter(committee => {
      const matchesSearch = !committeeSearch || 
        committee.name?.toLowerCase().includes(committeeSearch.toLowerCase());
      
      const matchesChamber = !committeeChamberFilter || committeeChamberFilter === "all" ||
        committee.chamber?.toLowerCase().includes(committeeChamberFilter.toLowerCase());
      
      return matchesSearch && matchesChamber;
    }) || [];
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
                  {billsLoading ? (
                    <div className="space-y-3">
                      {[...Array(5)].map((_, i) => (
                        <Skeleton key={i} className="h-16 w-full" />
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filterBills(bills)?.slice(0, 20).map((bill: any, i: number) => (
                        <Card key={i} className="p-3">
                          <h4 className="font-semibold text-sm">{bill.title}</h4>
                          <p className="text-xs text-muted-foreground">
                            {bill.latestAction?.actionDate} - {bill.latestAction?.text}
                          </p>
                        </Card>
                      ))}
                    </div>
                  )}
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
                    value={selectedCongress}
                    onChange={(e) => setSelectedCongress(e.target.value)}
                    className="w-64"
                  />
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setSelectedCongress("119")}
                  >
                    Current (119th)
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-96">
                  {billsByCongressLoading ? (
                    <div className="space-y-3">
                      {[...Array(5)].map((_, i) => (
                        <Skeleton key={i} className="h-16 w-full" />
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filterBills(billsByCongress)?.slice(0, 20).map((bill: any, i: number) => (
                        <Card key={i} className="p-3">
                          <h4 className="font-semibold text-sm">{bill.title}</h4>
                          <p className="text-xs text-muted-foreground">
                            Congress {bill.congress} - {bill.latestAction?.actionDate}
                          </p>
                        </Card>
                      ))}
                    </div>
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
                {committeesLoading ? (
                  <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="text-sm text-muted-foreground mb-2">
                      Showing {filterCommittees(committees).length} of {committees?.length || 0} committees
                    </div>
                    {filterCommittees(committees)?.map((committee: any, i: number) => (
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
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}