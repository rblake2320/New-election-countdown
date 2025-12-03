import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar, Flag } from "lucide-react";

const ELECTION_VERSIONS = [
  {
    id: 'midterm-2026',
    name: '2026 Midterm Elections',
    description: 'All elections from now through November 2026',
    targetDate: '2026-11-03',
    isActive: true
  },
  {
    id: 'presidential-2028',
    name: '2028 Presidential Election',
    description: 'Complete tracking for the 2028 presidential race',
    targetDate: '2028-11-07',
    isActive: false
  }
];

interface VersionSelectorProps {
  currentVersion: string;
  onVersionChange: (version: string) => void;
}

export function VersionSelector({ currentVersion, onVersionChange }: VersionSelectorProps) {
  const selectedVersion = ELECTION_VERSIONS.find(v => v.id === currentVersion) || ELECTION_VERSIONS[0];

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Flag className="h-4 w-4" />
        <span className="text-sm font-medium">Election Cycle</span>
      </div>
      
      <Select value={currentVersion} onValueChange={onVersionChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select election cycle" />
        </SelectTrigger>
        <SelectContent>
          {ELECTION_VERSIONS.map((version) => (
            <SelectItem key={version.id} value={version.id}>
              <div className="flex items-center justify-between w-full">
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{version.name}</span>
                    {version.isActive && (
                      <Badge variant="default" className="text-xs">Current</Badge>
                    )}
                    {!version.isActive && (
                      <Badge variant="outline" className="text-xs">Coming Soon</Badge>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">{version.description}</span>
                </div>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="text-xs text-muted-foreground flex items-center gap-1">
        <Calendar className="h-3 w-3" />
        Target: {new Date(selectedVersion.targetDate).toLocaleDateString()}
      </div>
    </div>
  );
}