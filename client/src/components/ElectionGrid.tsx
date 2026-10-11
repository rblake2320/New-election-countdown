import { forwardRef, type HTMLAttributes } from "react";
import { Virtuoso, VirtuosoGrid } from "react-virtuoso";
import { ElectionCard } from "@/components/election-card";

// Both views are virtualized against the page scroll: only cards near the
// viewport mount, so DOM size, countdown timers and per-card candidate requests
// stay bounded regardless of how many races match (List used to mount all 506:
// ~45k DOM nodes and 506 candidate requests on one load). Window scrolling also
// removes the nested scroll box the grid used.

// List semantics belong on the element that contains the items (axe:
// aria-required-children).
const GridList = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>((props, ref) => (
  <div ref={ref} {...props} role="list" aria-label="Elections" />
));
GridList.displayName = "ElectionGridList";
const GridItem = (props: HTMLAttributes<HTMLDivElement>) => <div {...props} role="listitem" />;

const RowList = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>((props, ref) => (
  <div ref={ref} {...props} role="list" aria-label="Elections" />
));
RowList.displayName = "ElectionRowList";
const RowItem = (props: HTMLAttributes<HTMLDivElement>) => <div {...props} role="listitem" className="pb-4" />;

export default function ElectionGrid({ data, viewMode = "grid" }: { data: any[]; viewMode?: "grid" | "list" }) {
  if (viewMode === "list") {
    return (
      <Virtuoso
        useWindowScroll
        data={data}
        increaseViewportBy={400}
        computeItemKey={(_, e) => e.id}
        itemContent={(_, e) => <ElectionCard election={e} viewMode="list" />}
        components={{ List: RowList, Item: RowItem }}
      />
    );
  }
  return (
    <VirtuosoGrid
      useWindowScroll
      totalCount={data.length}
      computeItemKey={(i) => data[i]?.id ?? i}
      itemContent={(i) => <ElectionCard election={data[i]} viewMode="grid" />}
      listClassName="unified-grid"
      increaseViewportBy={400}
      components={{
        List: GridList,
        Item: GridItem,
        Footer: () => <div className="h-2" />,
      }}
    />
  );
}
