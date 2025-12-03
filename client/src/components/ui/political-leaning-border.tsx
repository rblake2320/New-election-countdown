import { cn } from "@/lib/utils";

interface PoliticalLeaningBorderProps {
  leaning: 'left' | 'right' | 'split' | 'neutral';
  intensity?: 'low' | 'medium' | 'high';
  children: React.ReactNode;
  className?: string;
}

const leaningStyles = {
  left: {
    low: 'before:bg-[conic-gradient(#000,#1e40af_5%,#000_38%,#000_50%,#3b82f6_60%,#000_87%)]',
    medium: 'before:bg-[conic-gradient(#000,#1d4ed8_5%,#000_38%,#000_50%,#2563eb_60%,#000_87%)]',
    high: 'before:bg-[conic-gradient(#000,#1e3a8a_5%,#000_38%,#000_50%,#1d4ed8_60%,#000_87%)]'
  },
  right: {
    low: 'before:bg-[conic-gradient(#000,#dc2626_5%,#000_38%,#000_50%,#ef4444_60%,#000_87%)]',
    medium: 'before:bg-[conic-gradient(#000,#b91c1c_5%,#000_38%,#000_50%,#dc2626_60%,#000_87%)]',
    high: 'before:bg-[conic-gradient(#000,#991b1b_5%,#000_38%,#000_50%,#b91c1c_60%,#000_87%)]'
  },
  split: {
    low: 'before:bg-[conic-gradient(#000,#7c3aed_5%,#000_38%,#000_50%,#a855f7_60%,#000_87%)]',
    medium: 'before:bg-[conic-gradient(#000,#6d28d9_5%,#000_38%,#000_50%,#8b5cf6_60%,#000_87%)]',
    high: 'before:bg-[conic-gradient(#000,#5b21b6_5%,#000_38%,#000_50%,#7c3aed_60%,#000_87%)]'
  },
  neutral: {
    low: 'before:bg-[conic-gradient(#000,#6b7280_5%,#000_38%,#000_50%,#9ca3af_60%,#000_87%)]',
    medium: 'before:bg-[conic-gradient(#000,#4b5563_5%,#000_38%,#000_50%,#6b7280_60%,#000_87%)]',
    high: 'before:bg-[conic-gradient(#000,#374151_5%,#000_38%,#000_50%,#4b5563_60%,#000_87%)]'
  }
};

const secondaryGradients = {
  left: 'before:bg-[conic-gradient(rgba(0,0,0,0),#1e40af,rgba(0,0,0,0)_10%,rgba(0,0,0,0)_50%,#3b82f6,rgba(0,0,0,0)_60%)]',
  right: 'before:bg-[conic-gradient(rgba(0,0,0,0),#dc2626,rgba(0,0,0,0)_10%,rgba(0,0,0,0)_50%,#ef4444,rgba(0,0,0,0)_60%)]',
  split: 'before:bg-[conic-gradient(rgba(0,0,0,0),#7c3aed,rgba(0,0,0,0)_10%,rgba(0,0,0,0)_50%,#a855f7,rgba(0,0,0,0)_60%)]',
  neutral: 'before:bg-[conic-gradient(rgba(0,0,0,0),#6b7280,rgba(0,0,0,0)_10%,rgba(0,0,0,0)_50%,#9ca3af,rgba(0,0,0,0)_60%)]'
};

const simpleBorderColors = {
  left: 'border-blue-500 border-4',
  right: 'border-red-500 border-4', 
  split: 'border-purple-500 border-4',
  neutral: 'border-gray-400 border-2'
};

export function PoliticalLeaningBorder({ 
  leaning, 
  intensity = 'medium', 
  children, 
  className 
}: PoliticalLeaningBorderProps) {
  console.log('PoliticalLeaningBorder rendering with leaning:', leaning);
  
  return (
    <div className={cn("relative group", className)}>
      {/* Primary animated border */}
      <div className={cn(
        "absolute inset-0 overflow-hidden h-full w-full rounded-xl blur-[3px] pointer-events-none",
        "before:absolute before:content-[''] before:w-[999px] before:h-[999px]", 
        "before:bg-no-repeat before:top-1/2 before:left-1/2 before:-translate-x-1/2 before:-translate-y-1/2",
        "before:rotate-60 before:transition-all before:duration-2000 before:pointer-events-none",
        "group-hover:before:rotate-[-120deg] group-focus-within:before:rotate-[420deg]",
        "group-focus-within:before:duration-[4000ms]",
        leaningStyles[leaning][intensity]
      )}
      style={{ zIndex: -4 }}>
      </div>
      
      {/* Secondary animated border */}
      <div className={cn(
        "absolute inset-0 overflow-hidden h-full w-full rounded-xl blur-[3px] pointer-events-none",
        "before:absolute before:content-[''] before:w-[600px] before:h-[600px]",
        "before:bg-no-repeat before:top-1/2 before:left-1/2 before:-translate-x-1/2 before:-translate-y-1/2",
        "before:rotate-[82deg] before:transition-all before:duration-2000 before:pointer-events-none",
        "group-hover:before:rotate-[-98deg] group-focus-within:before:rotate-[442deg]",
        "group-focus-within:before:duration-[4000ms]",
        secondaryGradients[leaning]
      )}
      style={{ zIndex: -3 }}>
      </div>
      
      {/* Tertiary border for depth */}
      <div className={cn(
        "absolute inset-0 overflow-hidden h-full w-full rounded-lg blur-[2px] pointer-events-none",
        "before:absolute before:content-[''] before:w-[600px] before:h-[600px]",
        "before:bg-no-repeat before:top-1/2 before:left-1/2 before:-translate-x-1/2 before:-translate-y-1/2",
        "before:rotate-[83deg] before:brightness-140 before:transition-all before:duration-2000 before:pointer-events-none",
        "group-hover:before:rotate-[-97deg] group-focus-within:before:rotate-[443deg]",
        "group-focus-within:before:duration-[4000ms]",
        secondaryGradients[leaning]
      )}
      style={{ zIndex: -2 }}>
      </div>
      
      {/* Inner border for crisp definition */}
      <div className={cn(
        "absolute inset-0 overflow-hidden h-full w-full rounded-xl blur-[0.5px] pointer-events-none",
        "before:absolute before:content-[''] before:w-[600px] before:h-[600px]",
        "before:bg-no-repeat before:top-1/2 before:left-1/2 before:-translate-x-1/2 before:-translate-y-1/2",
        "before:rotate-70 before:brightness-130 before:transition-all before:duration-2000 before:pointer-events-none",
        "group-hover:before:rotate-[-110deg] group-focus-within:before:rotate-[430deg]",
        "group-focus-within:before:duration-[4000ms]",
        leaningStyles[leaning][intensity]
      )}
      style={{ zIndex: -1 }}>
      </div>
      
      {children}
    </div>
  );
}