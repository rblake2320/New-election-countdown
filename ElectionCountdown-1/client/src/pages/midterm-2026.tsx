import { Midterm2026Dashboard } from "@/components/midterm-2026-dashboard";
import { PageHead, pageMetadata } from "@/components/page-head";

export default function Midterm2026() {
  return (
    <div className="container mx-auto px-4 py-8">
      <PageHead {...pageMetadata.midterm2026} />
      <Midterm2026Dashboard />
    </div>
  );
}