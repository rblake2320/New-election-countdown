import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, User } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Candidate } from "@shared/schema";

interface CandidateCardProps {
  candidate: Candidate;
  onClick: (candidateId: number) => void;
  className?: string;
}

const partyColors = {
  Democratic: "bg-blue-500",
  Republican: "bg-red-500",
  Independent: "bg-purple-500",
  Libertarian: "bg-yellow-600",
  Green: "bg-green-600",
} as const;

export function CandidateCard({ candidate, onClick, className }: CandidateCardProps) {
  const partyKey = candidate.party as keyof typeof partyColors;
  const partyColor = partyColors[partyKey] || "bg-gray-500";

  return (
    <Card 
      className={cn(
        "candidate-card-uniform cursor-pointer transition-all duration-200",
        "hover:shadow-lg hover:scale-[1.02]",
        "flex flex-col",
        className
      )}
      onClick={() => onClick(candidate.id)}
      data-testid={`candidate-card-${candidate.id}`}
    >
      <CardContent className="p-0 flex flex-col h-full">
        {/* Photo Placeholder */}
        <div className="relative h-32 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 flex items-center justify-center rounded-t-lg overflow-hidden">
          <User className="h-16 w-16 text-gray-400 dark:text-gray-600" />
          
          {/* Winner Badge */}
          {candidate.isWinner && (
            <div className="absolute top-2 right-2">
              <Trophy className="h-6 w-6 text-yellow-500 drop-shadow-lg" />
            </div>
          )}
          
          {/* Party Color Strip */}
          <div className={cn("absolute bottom-0 left-0 right-0 h-1", partyColor)} />
        </div>

        {/* Content - Fixed Height */}
        <div className="p-4 flex flex-col justify-between flex-1">
          <div className="space-y-2">
            {/* Name - Always 2 lines max */}
            <h3 className="font-semibold text-base leading-tight line-clamp-2 min-h-[2.5rem] text-gray-900 dark:text-white">
              {candidate.name}
            </h3>
            
            {/* Party Badge */}
            <Badge 
              variant="outline" 
              className="text-xs w-fit"
            >
              {candidate.party}
            </Badge>
          </div>

          {/* Incumbent Badge at Bottom */}
          <div className="mt-3">
            {candidate.isIncumbent && (
              <Badge variant="secondary" className="text-xs">
                Incumbent
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
