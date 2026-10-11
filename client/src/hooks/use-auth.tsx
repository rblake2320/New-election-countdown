import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
  /** 'user' | 'admin' (users.role); a UI hint only, the server authorizes. */
  role?: string | null;
}

// Last signed-in user id seen by any useAuth caller; undefined until first load.
let lastUserId: string | null | undefined;

export function useAuth() {
  const queryClient = useQueryClient();
  
  const { data, isLoading, error } = useQuery({
    queryKey: ['/api/auth/me'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/auth/me', {
          credentials: 'include'
        });
        if (!response.ok) return null;
        const data = await response.json();
        return data.user as User;
      } catch {
        return null;
      }
    },
    retry: false
  });
  
  // A different person (or nobody) is now signed in: drop every cached query
  // except the auth check itself, so the previous user's watchlist, "Watching"
  // badges and preferences are not shown to the next one. Active queries refetch.
  useEffect(() => {
    if (isLoading) return;
    const id = data?.id ?? null;
    if (lastUserId !== undefined && lastUserId !== id) {
      queryClient.resetQueries({ predicate: q => q.queryKey[0] !== '/api/auth/me' });
    }
    lastUserId = id;
  }, [data, isLoading, queryClient]);

  const logoutMutation = useMutation({
    mutationFn: () => apiRequest('POST', '/api/auth/logout'),
    onSuccess: () => {
      queryClient.setQueryData(['/api/auth/me'], null);
    }
  });
  
  return {
    user: data || null,
    isLoading,
    isAuthenticated: !!data,
    logout: logoutMutation.mutate
  };
}