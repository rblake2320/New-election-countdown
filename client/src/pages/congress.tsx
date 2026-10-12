import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { CongressData } from "@/components/congress-data";
import { CongressMemberSearch } from "@/components/congress-member-search";

export default function Congress() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-white shadow-xs border-b border-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Wraps on phones so the admin link is never pushed off-screen. */}
          <div className="flex flex-wrap items-center justify-between gap-2 min-h-16 py-2">
            <div className="flex items-center gap-4 min-w-0">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/">
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Elections
                </Link>
              </Button>
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 shrink-0 bg-primary rounded-lg flex items-center justify-center">
                  <span className="text-primary-foreground font-bold">C</span>
                </div>
                <h1 className="text-xl font-bold">Congress Data</h1>
              </div>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/congress-admin">Data Management</Link>
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 space-y-8">
        <CongressMemberSearch />
        <CongressData />
      </div>
    </div>
  );
}