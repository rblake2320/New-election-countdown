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
  const [memberPartyFilter, setMemberPartyFilter] = useState("");
  const [memberStateFilter, setMemberStateFilter] = useState("");
  const [memberChamberFilter, setMemberChamberFilter] = useState("");
  
  const [billSearch, setBillSearch] = useState("");
  const [billStatusFilter, setBillStatusFilter] = useState("");
  
  const [committeeSearch, setCommitteeSearch] = useState("");
  const [committeeChamberFilter, setCommitteeChamberFilter] = useState("");

  // Bills API
  const { data: bills, isLoading: billsLoading } = useQuery({
    queryKey: ['/api/bills'],
    queryFn: async () => {
      const response = await fetch('/api/bills');
      return response.json();
    }
  });

  // Bills by Congress API
  const { data: billsByCongress, isLoading: billsByCongressLoading } = useQuery({
    queryKey: ['/api/bills', selectedCongress],
    queryFn: async () => {
      const response = await fetch(`/api/bills/${selectedCongress}`);
      return response.json();
    },
    enabled: !!selectedCongress
  });

  // Members API
  const { data: members, isLoading: membersLoading } = useQuery({
    queryKey: ['/api/members'],
    queryFn: async () => {
      const response = await fetch('/api/members');
      return response.json();
    }
  });

  // Members by State API
  const { data: membersByState, isLoading: membersByStateLoading } = useQuery({
    queryKey: ['/api/members', selectedState],
    queryFn: async () => {
      const response = await fetch(`/api/members/${selectedState}`);
      return response.json();
    },
    enabled: !!selectedState
  });

  // Committees API
  const { data: committees, isLoading: committeesLoading } = useQuery({
    queryKey: ['/api/committees'],
    queryFn: async () => {
      const response = await fetch('/api/committees');
      return response.json();
    }
  });

  // Committee Members API
  const { data: committeeMembers, isLoading: committeeMembersLoading } = useQuery({
    queryKey: ['/api/committees', selectedChamber, selectedCommitteeCode, 'members'],
    queryFn: async () => {
      const response = await fetch(`/api/committees/${selectedChamber}/${selectedCommitteeCode}/members`);
      return response.json();
    },
    enabled: !!selectedChamber && !!selectedCommitteeCode
  });

  // Congressional Records API
  const { data: congressionalRecords, isLoading: recordsLoading } = useQuery({
    queryKey: ['/api/congressional-records'],
    queryFn: async () => {
      const response = await fetch('/api/congressional-records');
      return response.json();
    }
  });

  // Senate Communications API
  const { data: senateCommunications, isLoading: senateLoading } = useQuery({
    queryKey: ['/api/senate-communications'],
    queryFn: async () => {
      const response = await fetch('/api/senate-communications');
      return response.json();
    }
  });

  // Nominations API
  const { data: nominations, isLoading: nominationsLoading } = useQuery({
    queryKey: ['/api/nominations'],
    queryFn: async () => {
      const response = await fetch('/api/nominations');
      return response.json();
    }
  });

  // House Votes API
  const { data: houseVotes, isLoading: votesLoading } = useQuery({
    queryKey: ['/api/house-votes'],
    queryFn: async () => {
      const response = await fetch('/api/house-votes');
      return response.json();
    }
  });

  const BillsList = ({ bills, loading }: { bills: any[], loading: boolean }) => (
    <ScrollArea className="h-96">
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {bills?.slice(0, 20).map((bill: any, i: number) => (
            <Card key={i} className="p-3">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h4 className="font-semibold text-sm">{bill.type} {bill.number}</h4>
                  <p className="text-sm text-muted-foreground line-clamp-2">{bill.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Latest: {typeof bill.latestAction === 'string' ? bill.latestAction : bill.latestAction?.text || 'No recent action'}
                  </p>
                </div>
                <Badge variant="outline">Congress {bill.congress}</Badge>
              </div>
            </Card>
          ))}
        </div>
      )}
    </ScrollArea>
  );

  const MembersList = ({ members, loading }: { members: any[], loading: boolean }) => {
    // Filter members based on search and filter criteria
    const filteredMembers = members?.filter(member => {
      const matchesSearch = !memberSearch || 
        member.name?.toLowerCase().includes(memberSearch.toLowerCase()) ||
        member.bioguideId?.toLowerCase().includes(memberSearch.toLowerCase());
      
      const matchesParty = !memberPartyFilter || 
        member.party?.toLowerCase().includes(memberPartyFilter.toLowerCase());
      
      const matchesState = !memberStateFilter || 
        member.state?.toLowerCase() === memberStateFilter.toLowerCase();
      
      const matchesChamber = !memberChamberFilter || 
        member.chamber?.toLowerCase().includes(memberChamberFilter.toLowerCase());
      
      return matchesSearch && matchesParty && matchesState && matchesChamber;
    }) || [];

    return (
    <ScrollArea className="h-96">
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredMembers?.map((member: any, i: number) => (
            <Card key={i} className="p-3">
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="font-semibold text-sm">{member.name}</h4>
                  <p className="text-sm text-muted-foreground">
                    {typeof member.party === 'string' ? member.party : member.party?.name || 'N/A'} - {typeof member.state === 'string' ? member.state : member.state?.name || 'N/A'} {member.district && `District ${member.district}`}
                  </p>
                </div>
                <Badge variant={member.party === 'D' ? 'default' : member.party === 'R' ? 'destructive' : 'secondary'}>
                  {member.party}
                </Badge>
              </div>
            </Card>
          ))}
        </div>
      )}
    </ScrollArea>
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Congressional Data</h2>
        <p className="text-muted-foreground">Real-time data from the U.S. Congress API</p>
      </div>

      <Tabs defaultValue="bills" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="bills">Bills</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="committees">Committees</TabsTrigger>
          <TabsTrigger value="records">Records</TabsTrigger>
          <TabsTrigger value="other">Other</TabsTrigger>
        </TabsList>

        <TabsContent value="bills" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>All Bills</CardTitle>
                <CardDescription>Latest bills from Congress</CardDescription>
              </CardHeader>
              <CardContent>
                <BillsList bills={bills} loading={billsLoading} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Bills by Congress</CardTitle>
                <CardDescription>Filter bills by Congress number</CardDescription>
                <div className="flex gap-2">
                  <Input
                    placeholder="Any Congress number (e.g., 119, 118, 110...)"
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
                <BillsList bills={billsByCongress} loading={billsByCongressLoading} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="members" className="space-y-4">
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
                      // Refresh the members data
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

        <TabsContent value="committees" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
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
                      {committees?.slice(0, 30).map((committee: any, i: number) => (
                        <Card key={i} className="p-3">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <h4 className="font-semibold text-sm">{committee.name}</h4>
                              <p className="text-xs text-muted-foreground">{committee.systemCode}</p>
                            </div>
                            <Badge variant="outline">{committee.chamber}</Badge>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Committee Members</CardTitle>
                <CardDescription>Members of specific committee</CardDescription>
                <div className="flex gap-2">
                  <select
                    value={selectedChamber}
                    onChange={(e) => setSelectedChamber(e.target.value)}
                    className="px-3 py-2 border rounded-md text-sm"
                  >
                    <option value="house">House</option>
                    <option value="senate">Senate</option>
                  </select>
                  <Input
                    placeholder="Committee code"
                    value={selectedCommitteeCode}
                    onChange={(e) => setSelectedCommitteeCode(e.target.value)}
                    className="w-32"
                  />
                </div>
              </CardHeader>
              <CardContent>
                <MembersList members={committeeMembers} loading={committeeMembersLoading} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="records" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Congressional Records</CardTitle>
              <CardDescription>Daily congressional records</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                {recordsLoading ? (
                  <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-20 w-full" />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {congressionalRecords?.slice(0, 20).map((record: any, i: number) => (
                      <Card key={i} className="p-3">
                        <h4 className="font-semibold text-sm">{record.title}</h4>
                        <p className="text-sm text-muted-foreground">{record.chamber} - {record.date}</p>
                      </Card>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="other" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Senate Communications</CardTitle>
                <CardDescription>Official Senate communications</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-64">
                  {senateLoading ? (
                    <div className="space-y-3">
                      {[...Array(3)].map((_, i) => (
                        <Skeleton key={i} className="h-16 w-full" />
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {senateCommunications?.slice(0, 10).map((comm: any, i: number) => (
                        <Card key={i} className="p-2">
                          <h5 className="text-xs font-medium">{comm.title}</h5>
                          <p className="text-xs text-muted-foreground">{comm.communicationType}</p>
                        </Card>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Nominations</CardTitle>
                <CardDescription>Presidential nominations</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-64">
                  {nominationsLoading ? (
                    <div className="space-y-3">
                      {[...Array(3)].map((_, i) => (
                        <Skeleton key={i} className="h-16 w-full" />
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {nominations?.slice(0, 10).map((nomination: any, i: number) => (
                        <Card key={i} className="p-2">
                          <h5 className="text-xs font-medium">{nomination.description}</h5>
                          <p className="text-xs text-muted-foreground">#{nomination.number}</p>
                        </Card>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>House Votes</CardTitle>
                <CardDescription>[BETA] Recent House votes</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-64">
                  {votesLoading ? (
                    <div className="space-y-3">
                      {[...Array(3)].map((_, i) => (
                        <Skeleton key={i} className="h-16 w-full" />
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {houseVotes?.slice(0, 10).map((vote: any, i: number) => (
                        <Card key={i} className="p-2">
                          <h5 className="text-xs font-medium">Roll Call #{vote.rollCallNumber}</h5>
                          <p className="text-xs text-muted-foreground">{vote.result}</p>
                        </Card>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}