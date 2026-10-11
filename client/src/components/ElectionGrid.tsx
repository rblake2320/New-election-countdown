import { forwardRef, type HTMLAttributes } from "react";
import { VirtuosoGrid } from "react-virtuoso";
import { ElectionCard } from "@/components/election-card";

// List semantics belong on the element that contains the items: the role used to
// sit on the scroll container, with the cards nested a level down and no
// listitem role (axe: aria-required-children).
const GridList = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>((props, ref) => (
  <div ref={ref} {...props} role="list" aria-label="Elections" />
));
GridList.displayName = "ElectionGridList";
const GridItem = (props: HTMLAttributes<HTMLDivElement>) => <div {...props} role="listitem" />;

export default function ElectionGrid({ data }: { data: any[] }) {
  return (
    <VirtuosoGrid
      style={{ height: "calc(100vh - 240px)" }}
      totalCount={data.length}
      itemContent={(i) => <ElectionCard election={data[i]} viewMode="grid" />}
      listClassName="unified-grid"
      overscan={300}
      components={{
        List: GridList,
        Item: GridItem,
        Footer: () => <div className="h-2" />,
      }}
    />
  );
}
