import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface WatchlistItem {
  electionId: string | number;
  addedAt: string;
}

export function useWatchlist() {
  const { isAuthenticated, user } = useAuth();
  const queryClient = useQueryClient();
  
  // Local storage for unauthenticated users
  const [localWatchlist, setLocalWatchlist] = useLocalStorage<WatchlistItem[]>("local-watchlist", []);
  const [syncPromptShown, setSyncPromptShown] = useLocalStorage<boolean>("watchlist-sync-prompted", false);
  
  // Server watchlist for authenticated users
  const { data: serverWatchlist = [], isLoading } = useQuery({
    queryKey: ["/api/user/watchlist"],
    enabled: isAuthenticated,
    retry: false,
  });

  // Mutation to sync watchlist with server
  const syncMutation = useMutation({
    mutationFn: async (items: WatchlistItem[]) => {
      return apiRequest("/api/user/watchlist/sync", {
        method: "POST",
        body: JSON.stringify({ items }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/watchlist"] });
      setLocalWatchlist([]); // Clear local after successful sync
    },
  });

  // Add to watchlist mutation
  const addMutation = useMutation({
    mutationFn: async (electionId: string | number) => {
      if (isAuthenticated) {
        return apiRequest(`/api/user/watchlist/${electionId}`, { method: "POST" });
      }
      return Promise.resolve();
    },
    onMutate: async (electionId) => {
      if (!isAuthenticated) {
        // Optimistically update local storage
        const newItem: WatchlistItem = {
          electionId,
          addedAt: new Date().toISOString(),
        };
        setLocalWatchlist([...localWatchlist, newItem]);
      }
    },
    onSuccess: () => {
      if (isAuthenticated) {
        queryClient.invalidateQueries({ queryKey: ["/api/user/watchlist"] });
      }
    },
  });

  // Remove from watchlist mutation
  const removeMutation = useMutation({
    mutationFn: async (electionId: string | number) => {
      if (isAuthenticated) {
        return apiRequest(`/api/user/watchlist/${electionId}`, { method: "DELETE" });
      }
      return Promise.resolve();
    },
    onMutate: async (electionId) => {
      if (!isAuthenticated) {
        // Optimistically update local storage
        setLocalWatchlist(localWatchlist.filter(item => item.electionId !== electionId));
      }
    },
    onSuccess: () => {
      if (isAuthenticated) {
        queryClient.invalidateQueries({ queryKey: ["/api/user/watchlist"] });
      }
    },
  });

  // Prompt to sync when user signs in with local watchlist items
  useEffect(() => {
    if (isAuthenticated && localWatchlist.length > 0 && !syncPromptShown) {
      setSyncPromptShown(true);
      // Return true to indicate sync is needed
    }
  }, [isAuthenticated, localWatchlist.length, syncPromptShown]);

  // Get current watchlist (local or server)
  const watchlist = isAuthenticated ? serverWatchlist : localWatchlist;
  
  // Check if an election is in watchlist
  const isInWatchlist = (electionId: string | number): boolean => {
    if (isAuthenticated) {
      return serverWatchlist.some((item: any) => item.electionId === electionId);
    }
    return localWatchlist.some(item => item.electionId === electionId);
  };

  // Toggle watchlist status
  const toggle = (electionId: string | number) => {
    if (isInWatchlist(electionId)) {
      removeMutation.mutate(electionId);
    } else {
      addMutation.mutate(electionId);
    }
  };

  // Sync local watchlist to server
  const syncToServer = () => {
    if (isAuthenticated && localWatchlist.length > 0) {
      syncMutation.mutate(localWatchlist);
    }
  };

  return {
    watchlist,
    isInWatchlist,
    toggle,
    add: addMutation.mutate,
    remove: removeMutation.mutate,
    syncToServer,
    hasLocalItems: localWatchlist.length > 0,
    needsSync: isAuthenticated && localWatchlist.length > 0 && !syncPromptShown,
    isLoading: isAuthenticated ? isLoading : false,
    isSyncing: syncMutation.isPending,
  };
}