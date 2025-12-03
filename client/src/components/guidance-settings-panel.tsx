import { useState } from 'react';
import { Settings, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface GuidanceSettingsPanelProps {
  guidanceEnabled: boolean;
  onToggleGuidance: (enabled: boolean) => void;
}

export function GuidanceSettingsPanel({ guidanceEnabled, onToggleGuidance }: GuidanceSettingsPanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 text-amber-600 hover:text-amber-800"
          data-testid="guidance-settings-trigger"
        >
          <Settings className="h-3 w-3" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Navigation Guidance Settings</DialogTitle>
          <DialogDescription>
            Control how the system helps you navigate and find elections.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="guidance-toggle" className="text-sm font-medium">
                Smart Filter Guidance
              </Label>
              <p className="text-xs text-muted-foreground">
                Show helpful suggestions when filter combinations won't return results
              </p>
            </div>
            <Switch
              id="guidance-toggle"
              checked={guidanceEnabled}
              onCheckedChange={onToggleGuidance}
              data-testid="guidance-toggle-switch"
            />
          </div>
          
          <div className="rounded-lg bg-muted p-3 text-xs text-muted-foreground">
            <p className="font-medium mb-1">What this affects:</p>
            <ul className="space-y-1 ml-2">
              <li>• Warning messages about incompatible filters</li>
              <li>• Suggested fixes for empty search results</li>
              <li>• Tips for finding elections in your area</li>
            </ul>
            <p className="mt-2">
              You can always change this setting later.
            </p>
          </div>
        </div>
        
        <div className="flex justify-end">
          <Button onClick={() => setIsOpen(false)} data-testid="guidance-settings-close">
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}