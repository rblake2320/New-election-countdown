import { CampaignPortal } from "@/components/campaign-portal";
import { PageHead, pageMetadata } from "@/components/page-head";

export default function CampaignPortalPage() {
  return (
    <div className="min-h-screen bg-background">
      <PageHead {...pageMetadata.campaignPortal} />
      <div className="container mx-auto px-4 py-8">
        <CampaignPortal />
      </div>
    </div>
  );
}