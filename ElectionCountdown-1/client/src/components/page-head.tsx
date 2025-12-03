import { useEffect } from "react";

interface PageHeadProps {
  title: string;
  description?: string;
  keywords?: string;
  ogImage?: string;
  canonical?: string;
}

export function PageHead({ title, description, keywords, ogImage, canonical }: PageHeadProps) {
  useEffect(() => {
    // Set page title
    document.title = title;

    // Set or update meta tags
    const setMetaTag = (name: string, content: string) => {
      let meta = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement;
      if (!meta) {
        meta = document.createElement('meta');
        meta.name = name;
        document.head.appendChild(meta);
      }
      meta.content = content;
    };

    const setMetaProperty = (property: string, content: string) => {
      let meta = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement;
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('property', property);
        document.head.appendChild(meta);
      }
      meta.content = content;
    };

    // Description
    if (description) {
      setMetaTag('description', description);
      setMetaProperty('og:description', description);
      setMetaTag('twitter:description', description);
    }

    // Keywords
    if (keywords) {
      setMetaTag('keywords', keywords);
    }

    // Open Graph tags
    setMetaProperty('og:title', title);
    setMetaProperty('og:type', 'website');
    setMetaProperty('og:url', window.location.href);
    
    if (ogImage) {
      setMetaProperty('og:image', ogImage);
      setMetaTag('twitter:image', ogImage);
    }

    // Twitter Card tags
    setMetaTag('twitter:card', 'summary_large_image');
    setMetaTag('twitter:title', title);
    setMetaTag('twitter:site', '@ElectionTracker');

    // Canonical URL
    if (canonical) {
      let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
      if (!link) {
        link = document.createElement('link');
        link.rel = 'canonical';
        document.head.appendChild(link);
      }
      link.href = canonical;
    }

    // Cleanup function - remove added tags when component unmounts
    return () => {
      // Note: In a real app, you might want to restore previous values
      // For now, we'll leave the tags as they help with SEO
    };
  }, [title, description, keywords, ogImage, canonical]);

  return null; // This component doesn't render anything
}

// Predefined page metadata for common pages
export const pageMetadata = {
  home: {
    title: "ElectionTracker - Live Election Data & Candidate Information",
    description: "Track federal, state, and local elections with real-time data, candidate profiles, and comprehensive voting information. Your trusted source for election monitoring.",
    keywords: "elections, voting, candidates, politics, election tracker, polls, congress, governors, mayors"
  },
  congress: {
    title: "Congress Tracker - Monitor Representatives & Legislative Activity",
    description: "Track your Congress members, view voting records, monitor bills, and stay informed about legislative activity in the House and Senate.",
    keywords: "congress, house of representatives, senate, bills, voting records, legislators, representatives"
  },
  campaignPortal: {
    title: "Campaign Portal - Professional Election Campaign Tools",
    description: "Access professional campaign management tools, voter outreach resources, and election support services for political campaigns.",
    keywords: "campaign management, political campaigns, voter outreach, election tools, campaign portal"
  },
  candidatePortal: {
    title: "Candidate Portal - Register & Manage Your Election Profile",
    description: "Register as a candidate, manage your election profile, access campaign resources, and connect with voters through our candidate platform.",
    keywords: "candidate registration, election profile, political candidates, campaign resources"
  },
  dataSteward: {
    title: "Data Steward - AI-Powered Election Data Validation",
    description: "Monitor election data integrity with our AI-powered validation system that detects issues, ensures accuracy, and maintains data quality.",
    keywords: "data validation, election data, AI monitoring, data integrity, automated verification"
  },
  monitoring: {
    title: "Real-Time Monitor - Live Election Updates & System Health",
    description: "Monitor live election updates, system health, and real-time data feeds from multiple sources with our comprehensive dashboard.",
    keywords: "real-time elections, live updates, system monitoring, election dashboard, live data"
  },
  civic: {
    title: "Civic Data APIs - Government Data & Information Services",
    description: "Access comprehensive government APIs, civic data aggregation tools, and official information services for electoral research.",
    keywords: "civic data, government APIs, electoral information, public data, civic information"
  },
  congressAdmin: {
    title: "Congress Admin - Legislative Data Management Interface",
    description: "Administrative interface for managing congressional data, member information, legislative tracking, and institutional oversight.",
    keywords: "congress administration, legislative management, congressional oversight, institutional data"
  },
  global: {
    title: "Global Observatory - Worldwide Election Monitoring",
    description: "Monitor elections worldwide, track international democratic processes, and access global election calendars and results.",
    keywords: "global elections, international democracy, worldwide voting, global politics, international elections"
  },
  midterm2026: {
    title: "2026 Midterm Elections - Complete Preview & Analysis",
    description: "Preview the 2026 midterm elections with 545+ offices up for election including Congress, Governors, and major mayoral races. Complete analysis and forecasts.",
    keywords: "2026 midterms, congressional elections, governor races, midterm elections, political forecasts"
  },
  auth: {
    title: "Sign In - ElectionTracker Account Access",
    description: "Sign in to your ElectionTracker account to access personalized features, save preferences, and unlock advanced election monitoring tools.",
    keywords: "sign in, login, account access, user authentication, election account"
  }
};