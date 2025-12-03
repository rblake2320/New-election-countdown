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

  const { data: members, isLoading: membersLoading } = useQuery({
    queryKey: ['/api/members'],
    queryFn: async () => {
      const response = await fetch('/api/members');
      const result = await response.json();
      // Ensure we always return an array, even if API returns error
      return Array.isArray(result) ? result : [];
    }
  });

  const { data: membersByState, isLoading: membersByStateLoading } = useQuery({
    queryKey: ['/api/members', selectedState],
    queryFn: async () => {
      const response = await fetch(`/api/members/${selectedState}`);
      return response.json();
    },
    enabled: !!selectedState
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
  const filterMembers = (membersList: any[]) => {
    return membersList?.filter(member => {
      const matchesSearch = !memberSearch || 
        member.name?.toLowerCase().includes(memberSearch.toLowerCase()) ||
        member.bioguideId?.toLowerCase().includes(memberSearch.toLowerCase());
      
      const matchesParty = !memberPartyFilter || memberPartyFilter === "all" ||
        member.party?.toLowerCase().includes(memberPartyFilter.toLowerCase());
      
      const matchesState = !memberStateFilter || 
        member.state?.toLowerCase() === memberStateFilter.toLowerCase();
      
      const matchesChamber = !memberChamberFilter || memberChamberFilter === "all" ||
        member.chamber?.toLowerCase().includes(memberChamberFilter.toLowerCase());
      
      return matchesSearch && matchesParty && matchesState && matchesChamber;
    }) || [];
  };

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

  const MembersList = ({ members, loading }: { members: any[], loading: boolean }) => {
    const filteredMembers = filterMembers(members);
    
    return (
      <ScrollArea className="h-96">
        {loading ? (
          <div className="space-y-3">
            {[...Array(10)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground mb-2">
              Showing {filteredMembers.length} of {members?.length || 0} members
            </div>
            {filteredMembers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No members found matching current filters
              </div>
            ) : (
              filteredMembers.map((member: any, i: number) => (
                <Card key={`${member.bioguideId || member.id || i}`} className="p-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-semibold text-sm">{member.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {member.party} - {member.state} {member.district && `District ${member.district}`}
                      </p>
                      <p className="text-xs text-muted-foreground">{member.chamber}</p>
                    </div>
                    <Badge variant={member.party === 'Democratic' ? 'default' : member.party === 'Republican' ? 'destructive' : 'secondary'}>
                      {member.party}
                    </Badge>
                  </div>
                </Card>
              ))
            )}
          </div>
        )}
      </ScrollArea>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Congressional Data</h2>
        <p className="text-muted-foreground">Real-time data from the U.S. Congress API</p>
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
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by party" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Parties</SelectItem>
                    <SelectItem value="Democratic">Democratic</SelectItem>
                    <SelectItem value="Republican">Republican</SelectItem>
                    <SelectItem value="Independent">Independent</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  placeholder="State (e.g., CA, NY)"
                  value={memberStateFilter}
                  onChange={(e) => setMemberStateFilter(e.target.value.toUpperCase())}
                  maxLength={2}
                />
                <Select value={memberChamberFilter} onValueChange={setMemberChamberFilter}>
                  <SelectTrigger>
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
                <CardDescription>House and Senate members ({members?.length || 0} total)</CardDescription>
                <Button 
                  onClick={async () => {
                    try {
                      const response = await fetch('/api/congress/sync-all', { method: 'POST' });
                      const result = await response.json();
                      console.log('Sync result:', result);
                      window.location.reload();
                    } catch (error) {
                      console.error('Sync failed:', error);
                    }
                  }}
                  variant="outline"
                  size="sm"
                  className="w-fit"
                >
                  Sync All 535+ Members
                </Button>
              </CardHeader>
              <CardContent>
                <MembersList members={members} loading={membersLoading} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Members by State</CardTitle>
                <CardDescription>Filter members by state</CardDescription>
                <div className="flex gap-2">
                  <Input
                    placeholder="State code (e.g., CA, NY)"
                    value={selectedState}
                    onChange={(e) => setSelectedState(e.target.value.toUpperCase())}
                    className="w-32"
                  />
                </div>
              </CardHeader>
              <CardContent>
                <MembersList members={membersByState} loading={membersByStateLoading} />
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