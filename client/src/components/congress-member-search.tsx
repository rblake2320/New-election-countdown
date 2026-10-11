import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, User, MapPin, Loader2 } from 'lucide-react';
import { currentCongress, fetchMembers, inCongress, memberPartyLabel, partyCode, seatLabel } from '@/lib/congress-members';

// Searches the member records already in the database. Adding members is done only
// by the source-bound Congress import, so this public search offers no write.
export function CongressMemberSearch() {
  const [searchTerm, setSearchTerm] = useState('');
  const term = searchTerm.trim();

  const searchQuery = useQuery({
    queryKey: ['/api/members/search', term],
    enabled: term.length >= 2,
    queryFn: ({ signal }) => fetchMembers(`/api/members/search?q=${encodeURIComponent(term)}`, signal),
  });
  const searchLoading = searchQuery.isFetching;
  const searchResults = searchQuery.data ? inCongress(searchQuery.data, currentCongress()) : [];

  // Results update as you type; the button and Enter re-run the current search.
  const handleSearch = () => {
    if (term.length >= 2) searchQuery.refetch();
  };

  const getPartyColor = (party: string | null | undefined) => {
    switch (partyCode(party)) {
      case 'R': return 'bg-red-100 text-red-800';
      case 'D': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search Congressional Members
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Enter member name (e.g., Nancy Pelosi, Ted Cruz)"
              aria-label="Member name"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <Button 
              onClick={handleSearch}
              disabled={term.length < 2}
              aria-label="Search members"
            >
              {searchLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
            </Button>
          </div>

          {term.length >= 2 && (
            <div className="space-y-3">
              {searchQuery.isError ? (
                <div role="alert" className="text-center py-6 space-y-3">
                  <p className="text-sm text-destructive">Search could not be completed, so no results are shown.</p>
                  <Button variant="outline" size="sm" onClick={() => searchQuery.refetch()}>Try again</Button>
                </div>
              ) : searchResults.length > 0 ? (
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Found in Database:</h4>
                  {searchResults.map((member, i) => (
                    <Card key={member.id ?? member.bioguideId ?? i} className="p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100">
                            <User className="h-5 w-5 text-blue-600" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium">{member.name}</p>
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <MapPin className="h-3 w-3 shrink-0" />
                              {member.state} · {seatLabel(member)}
                            </div>
                          </div>
                        </div>
                        <Badge className={getPartyColor(member.party)}>
                          {memberPartyLabel(member.party)}
                        </Badge>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : searchQuery.isSuccess && !searchLoading ? (
                <p className="text-center py-6 text-gray-600">
                  No current members match "{term}".
                </p>
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}