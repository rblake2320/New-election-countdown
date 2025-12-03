import { VirtuosoGrid } from "react-virtuoso";
import { ElectionCard } from "@/components/election-card";

export default function ElectionGrid({ data }: { data: any[] }) {
  return (
    <VirtuosoGrid
      style={{ height: "calc(100vh - 240px)" }}
      totalCount={data.length}
      itemContent={(i) => <ElectionCard election={data[i]} viewMode="grid" />}
      listClassName="unified-grid"
      overscan={300}
      components={{ 
        Footer: () => <div className="h-2" />
      }}
      role="list"
    />
  );
}