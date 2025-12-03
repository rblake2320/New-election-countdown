import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, User, MapPin, Loader2, Plus } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface CongressMember {
  id: number;
  bioguideId: string;
  name: string;
  party: string;
  state: string;
  district?: string;
  chamber: string;
}

export function CongressMemberSearch() {
  const [searchTerm, setSearchTerm] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Search existing members with proper query parameter
  const { data: searchResults = [], isLoading: searchLoading } = useQuery({
    queryKey: ['/api/members/search', searchTerm],
    enabled: searchTerm.length >= 2,
    queryFn: async () => {
      if (!searchTerm || searchTerm.length < 2) return [];
      const response = await fetch(`/api/members/search?q=${encodeURIComponent(searchTerm)}`);
      if (!response.ok) throw new Error('Search failed');
      return response.json();
    },
  });

  // Perplexity search for missing members
  const perplexitySearch = useMutation({
    mutationFn: async (name: string) => {
      return await apiRequest(`/api/congress/find-member`, {
        method: 'POST',
        body: { memberName: name }
      });
    },
    onSuccess: (data) => {
      if (data.found) {
        toast({
          title: "Member Found and Added",
          description: `${data.member.name} has been added to the database.`,
        });
        // Refresh the search results
        queryClient.invalidateQueries({ queryKey: ['/api/members/search'] });
        queryClient.invalidateQueries({ queryKey: ['/api/members'] });
      } else {
        toast({
          title: "Member Not Found",
          description: data.message || "Could not find this member in official records.",
          variant: "destructive",
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Search Error",
        description: "Failed to search for member. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSearch = () => {
    setHasSearched(true);
  };

  const handlePerplexitySearch = () => {
    if (searchTerm.trim()) {
      perplexitySearch.mutate(searchTerm.trim());
    }
  };

  const getPartyColor = (party: string) => {
    switch (party?.toLowerCase()) {
      case 'republican': return 'bg-red-100 text-red-800';
      case 'democratic': return 'bg-blue-100 text-blue-800';
      case 'independent': return 'bg-gray-100 text-gray-800';
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
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <Button 
              onClick={handleSearch}
              disabled={searchTerm.length < 2 || searchLoading}
            >
              {searchLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
            </Button>
          </div>

          {searchTerm.length >= 2 && (
            <div className="space-y-3">
              {searchResults.length > 0 ? (
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Found in Database:</h4>
                  {searchResults.map((member: CongressMember) => (
                    <Card key={member.id} className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                            <User className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-medium">{member.name}</p>
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <MapPin className="h-3 w-3" />
                              {member.state}{member.district ? `-${member.district}` : ''} • {member.chamber}
                            </div>
                          </div>
                        </div>
                        <Badge className={getPartyColor(member.party)}>
                          {member.party || 'Unknown'}
                        </Badge>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : hasSearched && !searchLoading ? (
                <div className="text-center py-6 space-y-3">
                  <p className="text-gray-600">
                    No members found in current database for "{searchTerm}"
                  </p>
                  <Button
                    onClick={handlePerplexitySearch}
                    disabled={perplexitySearch.isPending}
                    variant="outline"
                    className="gap-2"
                  >
                    {perplexitySearch.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                    Search Official Records & Add to Database
                  </Button>
                </div>
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}