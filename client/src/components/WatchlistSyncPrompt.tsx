import { useWatchlist } from "@/hooks/useWatchlist";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Info } from "lucide-react";

export function WatchlistSyncPrompt() {
  const { needsSync, hasLocalItems, syncToServer, isSyncing } = useWatchlist();

  if (!needsSync) return null;

  return (
    <Alert className="mb-4">
      <Info className="h-4 w-4" />
      <AlertDescription className="flex items-center justify-between">
        <span>You have saved elections from before signing in. Would you like to keep them?</span>
        <Button
          size="sm"
          onClick={syncToServer}
          disabled={isSyncing}
        >
          {isSyncing ? "Syncing..." : "Keep My Elections"}
        </Button>
      </AlertDescription>
    </Alert>
  );
}