import { useQuery } from "@tanstack/react-query";
import ElectionGrid from "@/components/ElectionGrid";

function useApiKeysStatus() {
  return {
    hasPropublica: !!import.meta.env.VITE_PROPUBLICA_KEY,
    hasOpenAI:     !!import.meta.env.VITE_OPENAI_KEY,
  };
}

export default function ElectionsPage() {
  const keys = useApiKeysStatus();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["elections", { limit: 1000 }],
    queryFn: async () => {
      const res = await fetch("/api/elections?limit=1000");
      if (!res.ok) throw new Error("Failed to fetch elections");
      return (await res.json()) as any[];
    }
  });

  if (isLoading) return <div className="p-6 text-sm text-muted-foreground">Loading elections…</div>;
  if (isError)   return <div className="p-6 text-sm text-red-600">Could not load elections.</div>;
  if (!data?.length) return <div className="p-6 text-sm">No elections found.</div>;

  return (
    <div className="p-4 space-y-3">
      {!keys.hasPropublica && (
        <div className="text-xs px-3 py-2 rounded-lg bg-amber-50 text-amber-800 border">
          ProPublica features are limited until a key is added.
        </div>
      )}
      {!keys.hasOpenAI && (
        <div className="text-xs px-3 py-2 rounded-lg bg-amber-50 text-amber-800 border">
          AI features are disabled until an OpenAI key is added.
        </div>
      )}
      <ElectionGrid data={data} />
    </div>
  );
}