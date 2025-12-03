import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, MapPin, Loader2, AlertCircle } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface VoterInfoResult {
  election: {
    id: number;
    title: string;
    date: string;
    location: string;
    state: string;
  };
  contests: Array<{
    office: string;
    candidates: Array<{
      name: string;
      party: string;
      website?: string;
    }>;
  }>;
}

export function VoterInfoLookup() {
  const [address, setAddress] = useState("");
  const [voterInfo, setVoterInfo] = useState<VoterInfoResult | null>(null);

  const voterInfoMutation = useMutation({
    mutationFn: async (searchAddress: string) => {
      const response = await fetch(`/api/voter-info?address=${encodeURIComponent(searchAddress)}`);
      if (!response.ok) {
        throw new Error('Failed to fetch voter information');
      }
      return response.json();
    },
    onSuccess: (data) => {
      setVoterInfo(data);
    },
    onError: (error) => {
      console.error('Error fetching voter info:', error);
    },
  });

  const handleSearch = () => {
    if (address.trim()) {
      voterInfoMutation.mutate(address.trim());
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Voter Information Lookup
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Enter your address to find elections and candidates specific to your location
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="Enter your address (e.g., 123 Main St, City, State)"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={voterInfoMutation.isPending}
          />
          <Button 
            onClick={handleSearch} 
            disabled={!address.trim() || voterInfoMutation.isPending}
          >
            {voterInfoMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
          </Button>
        </div>

        {voterInfoMutation.isError && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">
              Unable to find voter information for this address. Please check the address and try again.
            </span>
          </div>
        )}

        {voterInfo && voterInfo.election && (
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-2">{voterInfo.election.title || 'Election Information'}</h3>
              <div className="text-sm text-blue-700">
                <p>Date: {voterInfo.election.date ? new Date(voterInfo.election.date).toLocaleDateString() : 'Date TBD'}</p>
                <p>Location: {voterInfo.election.location || 'Location TBD'}</p>
                <p>State: {voterInfo.election.state || 'State TBD'}</p>
              </div>
            </div>

            {voterInfo.contests && voterInfo.contests.length > 0 && (
              <div>
                <h4 className="font-semibold mb-3">Contests on Your Ballot</h4>
                <div className="space-y-3">
                  {voterInfo.contests.map((contest, index) => (
                    <div key={index} className="border rounded-lg p-3">
                      <h5 className="font-medium mb-2">{contest.office}</h5>
                      <div className="space-y-2">
                        {contest.candidates.map((candidate, candidateIndex) => (
                          <div key={candidateIndex} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span>{candidate.name}</span>
                              <Badge variant="outline">{candidate.party}</Badge>
                            </div>
                            {candidate.website && (
                              <a
                                href={candidate.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 text-sm"
                              >
                                Website
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}