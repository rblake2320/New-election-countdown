import { type Election, type Candidate, type ElectionFilters } from "@shared/schema";

export const partyColors = {
  D: "bg-blue-500 text-white",
  R: "bg-red-500 text-white", 
  I: "bg-purple-500 text-white",
  G: "bg-green-500 text-white",
  L: "bg-yellow-500 text-black",
} as const;

export const partyNames = {
  D: "Democratic",
  R: "Republican",
  I: "Independent", 
  G: "Green",
  L: "Libertarian",
} as const;

export const electionTypeColors = {
  primary: "bg-blue-100 text-blue-800",
  general: "bg-amber-100 text-amber-800",
  special: "bg-orange-100 text-orange-800",
} as const;

export const electionLevelColors = {
  federal: "bg-purple-100 text-purple-800",
  state: "bg-blue-100 text-blue-800", 
  local: "bg-green-100 text-green-800",
} as const;

export function getUrgencyLevel(date: Date | string): "urgent" | "soon" | "normal" | "future" {
  const now = new Date();
  const targetDate = typeof date === 'string' ? new Date(date) : date;
  const diffMs = targetDate.getTime() - now.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  if (diffDays < 0) return "urgent"; // Past due
  if (diffDays <= 7) return "urgent";
  if (diffDays <= 30) return "soon";
  if (diffDays <= 90) return "normal";
  return "future";
}

export function getUrgencyColor(urgency: string): string {
  switch (urgency) {
    case "urgent": return "border-l-red-500";
    case "soon": return "border-l-orange-500";
    case "normal": return "border-l-blue-500";
    case "future": return "border-l-gray-300";
    default: return "border-l-gray-300";
  }
}

export function formatElectionDate(date: Date | string): string {
  const targetDate = typeof date === 'string' ? new Date(date) : date;
  return targetDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

export function calculateTimeRemaining(targetDate: Date | string) {
  const now = new Date().getTime();
  const target = typeof targetDate === 'string' ? new Date(targetDate).getTime() : targetDate.getTime();
  const difference = target - now;

  if (difference < 0) {
    return {
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      milliseconds: 0,
      expired: true
    };
  }

  const days = Math.floor(difference / (1000 * 60 * 60 * 24));
  const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((difference % (1000 * 60)) / 1000);
  const milliseconds = Math.floor(difference % 1000);

  return {
    days,
    hours,
    minutes,
    seconds,
    milliseconds,
    expired: false
  };
}

export const statesList = [
  { value: "all", label: "All States" },
  { value: "AL", label: "Alabama" },
  { value: "AK", label: "Alaska" },
  { value: "AZ", label: "Arizona" },
  { value: "AR", label: "Arkansas" },
  { value: "CA", label: "California" },
  { value: "CO", label: "Colorado" },
  { value: "CT", label: "Connecticut" },
  { value: "DE", label: "Delaware" },
  { value: "FL", label: "Florida" },
  { value: "GA", label: "Georgia" },
  { value: "HI", label: "Hawaii" },
  { value: "ID", label: "Idaho" },
  { value: "IL", label: "Illinois" },
  { value: "IN", label: "Indiana" },
  { value: "IA", label: "Iowa" },
  { value: "KS", label: "Kansas" },
  { value: "KY", label: "Kentucky" },
  { value: "LA", label: "Louisiana" },
  { value: "ME", label: "Maine" },
  { value: "MD", label: "Maryland" },
  { value: "MA", label: "Massachusetts" },
  { value: "MI", label: "Michigan" },
  { value: "MN", label: "Minnesota" },
  { value: "MS", label: "Mississippi" },
  { value: "MO", label: "Missouri" },
  { value: "MT", label: "Montana" },
  { value: "NE", label: "Nebraska" },
  { value: "NV", label: "Nevada" },
  { value: "NH", label: "New Hampshire" },
  { value: "NJ", label: "New Jersey" },
  { value: "NM", label: "New Mexico" },
  { value: "NY", label: "New York" },
  { value: "NC", label: "North Carolina" },
  { value: "ND", label: "North Dakota" },
  { value: "OH", label: "Ohio" },
  { value: "OK", label: "Oklahoma" },
  { value: "OR", label: "Oregon" },
  { value: "PA", label: "Pennsylvania" },
  { value: "RI", label: "Rhode Island" },
  { value: "SC", label: "South Carolina" },
  { value: "SD", label: "South Dakota" },
  { value: "TN", label: "Tennessee" },
  { value: "TX", label: "Texas" },
  { value: "UT", label: "Utah" },
  { value: "VT", label: "Vermont" },
  { value: "VA", label: "Virginia" },
  { value: "WA", label: "Washington" },
  { value: "WV", label: "West Virginia" },
  { value: "WI", label: "Wisconsin" },
  { value: "WY", label: "Wyoming" },
  { value: "DC", label: "Washington D.C." },
  { value: "PR", label: "Puerto Rico" },
  { value: "GU", label: "Guam" },
  { value: "VI", label: "U.S. Virgin Islands" },
  { value: "AS", label: "American Samoa" },
  { value: "MP", label: "Northern Mariana Islands" },
];
