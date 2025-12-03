import React from 'react';
import BotPanel from '@/components/BotPanel';
import { AutofixPanel } from '@/components/AutofixPanel';
import { PolicyTogglePanel } from '@/components/PolicyTogglePanel';
import { AuditRunsPanel } from '@/components/AuditRunsPanel';
import { AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageHead, pageMetadata } from '@/components/page-head';
import { PageTitle } from '@/components/breadcrumb-nav';

export default function DataSteward() {
  return (
    <>
      <PageHead {...pageMetadata.dataSteward} />
      <div className="container mx-auto py-8 px-4">
        <div className="mb-6">
          <PageTitle 
            title="Data Steward"
            subtitle="Monitor and maintain data integrity across the election platform"
          />
        </div>

      <Alert className="mb-6">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          The Data Steward Bot automatically scans for data integrity issues including:
          congress member counts, missing candidates in priority elections, date discrepancies,
          and CA uniform district election compliance. Now with auto-fix capabilities for safe remediations.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="suggestions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="suggestions">Suggestions</TabsTrigger>
          <TabsTrigger value="autofix">Auto-fix</TabsTrigger>
          <TabsTrigger value="policies">Policies</TabsTrigger>
          <TabsTrigger value="audit">Audit Runs</TabsTrigger>
        </TabsList>
        
        <TabsContent value="suggestions">
          <BotPanel />
        </TabsContent>
        
        <TabsContent value="autofix">
          <AutofixPanel />
        </TabsContent>
        
        <TabsContent value="policies">
          <PolicyTogglePanel />
        </TabsContent>
        
        <TabsContent value="audit">
          <AuditRunsPanel />
        </TabsContent>
      </Tabs>
    </div>
    </>
  );
}