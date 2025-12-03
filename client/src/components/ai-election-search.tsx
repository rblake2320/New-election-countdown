import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Search, Sparkles, Loader2 } from "lucide-react";

export function AIElectionSearch() {
  const [query, setQuery] = useState("");
  const [cityQuery, setCityQuery] = useState("");
  const [results, setResults] = useState("");
  const [localResults, setLocalResults] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isLocalSearching, setIsLocalSearching] = useState(false);
  const [isExpanding, setIsExpanding] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    
    setIsSearching(true);
    try {
      const response = await fetch('/api/search-elections', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      });
      
      const data = await response.json();
      setResults(data.results);
    } catch (error) {
      console.error('Error searching elections:', error);
      setResults('Error searching for election information. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleLocalSearch = async () => {
    if (!cityQuery.trim()) return;
    
    setIsLocalSearching(true);
    try {
      const response = await fetch(`/api/elections-by-location?address=${encodeURIComponent(cityQuery)}`);
      const data = await response.json();
      
      if (response.ok) {
        let resultText = `📍 Location: ${data.location.city}, ${data.location.state}\n\n`;
        resultText += `🗳️ Local Elections Found: ${data.localElectionsFound}\n`;
        resultText += `📊 Total State Elections: ${data.totalStateElections}\n\n`;
        
        if (data.aiVerification) {
          resultText += `🤖 AI Verification:\n${data.aiVerification}\n\n`;
        }
        
        if (data.elections.length > 0) {
          resultText += `📋 Elections:\n`;
          data.elections.slice(0, 5).forEach((election: any) => {
            resultText += `• ${election.title} - ${new Date(election.date).toLocaleDateString()}\n`;
          });
        } else {
          resultText += `No local elections found for ${data.location.city}. The AI verification above may contain additional information about upcoming elections.`;
        }
        
        setLocalResults(resultText);
      } else {
        setLocalResults(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error searching local elections:', error);
      setLocalResults('Error searching for local election information. Please try again.');
    } finally {
      setIsLocalSearching(false);
    }
  };

  const handleExpandData = async () => {
    setIsExpanding(true);
    try {
      const response = await fetch('/api/expand-elections', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });
      
      if (response.ok) {
        setResults('Election data expansion initiated. Check console for comprehensive results.');
      }
    } catch (error) {
      console.error('Error expanding election data:', error);
      setResults('Error expanding election data. Please try again.');
    } finally {
      setIsExpanding(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          AI Election Search
        </CardTitle>
        <CardDescription>
          Search for comprehensive election information using AI
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="Search for elections, candidates, or dates..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          />
          <Button 
            onClick={handleSearch} 
            disabled={isSearching || !query.trim()}
            size="sm"
          >
            {isSearching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
          </Button>
        </div>

        <div className="border-t pt-4">
          <h3 className="text-sm font-medium mb-2">Local Election Search</h3>
          <div className="flex gap-2">
            <Input
              placeholder="Enter city, town, or address..."
              value={cityQuery}
              onChange={(e) => setCityQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleLocalSearch()}
            />
            <Button 
              onClick={handleLocalSearch} 
              disabled={isLocalSearching || !cityQuery.trim()}
              variant="outline"
              size="sm"
            >
              {isLocalSearching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        <Button 
          onClick={handleExpandData} 
          disabled={isExpanding}
          variant="outline"
          className="w-full"
          size="sm"
        >
          {isExpanding ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Expanding Election Data...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Find All Missing Elections (2025-2026)
            </>
          )}
        </Button>

        {results && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Search Results:</h4>
            <Textarea 
              value={results}
              readOnly
              className="min-h-32 text-xs font-mono"
              placeholder="AI search results will appear here..."
            />
          </div>
        )}

        {localResults && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Local Election Results:</h4>
            <Textarea 
              value={localResults}
              readOnly
              className="min-h-32 text-xs font-mono"
              placeholder="Local election search results will appear here..."
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}