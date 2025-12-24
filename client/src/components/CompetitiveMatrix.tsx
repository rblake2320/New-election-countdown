import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, MinusCircle } from 'lucide-react';

interface Feature {
  name: string;
  electionTracker: boolean | string;
  fiveThirtyEight: boolean | string;
  ballotpedia: boolean | string;
  voteSmart: boolean | string;
}

/**
 * Competitive Feature Matrix
 * Side-by-side comparison highlighting competitive advantages
 */
export function CompetitiveMatrix() {
  const features: Feature[] = [
    {
      name: 'Elections Tracked',
      electionTracker: '587+',
      fiveThirtyEight: '~200',
      ballotpedia: '~300',
      voteSmart: '~150'
    },
    {
      name: 'Real-Time Data',
      electionTracker: true,
      fiveThirtyEight: true,
      ballotpedia: false,
      voteSmart: false
    },
    {
      name: 'Mobile Optimized',
      electionTracker: true,
      fiveThirtyEight: 'Partial',
      ballotpedia: false,
      voteSmart: false
    },
    {
      name: 'Candidate Portal',
      electionTracker: true,
      fiveThirtyEight: false,
      ballotpedia: false,
      voteSmart: false
    },
    {
      name: 'API Access',
      electionTracker: true,
      fiveThirtyEight: false,
      ballotpedia: 'Limited',
      voteSmart: false
    },
    {
      name: 'Live Polling Data',
      electionTracker: true,
      fiveThirtyEight: true,
      ballotpedia: 'Historical',
      voteSmart: false
    },
    {
      name: 'Local Elections',
      electionTracker: true,
      fiveThirtyEight: 'Partial',
      ballotpedia: true,
      voteSmart: false
    },
    {
      name: 'Campaign Finance',
      electionTracker: true,
      fiveThirtyEight: true,
      ballotpedia: 'Partial',
      voteSmart: true
    },
    {
      name: 'Tech Stack (Modern)',
      electionTracker: '2025',
      fiveThirtyEight: '2020',
      ballotpedia: '2015',
      voteSmart: '2010'
    },
    {
      name: 'Recommendation Engine',
      electionTracker: true,
      fiveThirtyEight: false,
      ballotpedia: false,
      voteSmart: false
    }
  ];

  const renderValue = (value: boolean | string) => {
    if (typeof value === 'boolean') {
      return value ? (
        <CheckCircle2 className="h-5 w-5 text-green-600" />
      ) : (
        <XCircle className="h-5 w-5 text-gray-300" />
      );
    }
    
    if (value === 'Partial' || value === 'Limited' || value === 'Historical') {
      return (
        <div className="flex items-center gap-1">
          <MinusCircle className="h-5 w-5 text-yellow-500" />
          <span className="text-xs text-muted-foreground">{value}</span>
        </div>
      );
    }
    
    return <span className="font-medium text-sm">{value}</span>;
  };

  const getColumnClass = (column: 'electionTracker' | 'fiveThirtyEight' | 'ballotpedia' | 'voteSmart') => {
    return column === 'electionTracker' 
      ? 'bg-green-50 border-l-4 border-green-500' 
      : '';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Competitive Analysis</CardTitle>
        <CardDescription>
          Feature comparison with leading election platforms
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b">
                <th className="text-left p-3 font-semibold">Feature</th>
                <th className={`text-center p-3 font-semibold ${getColumnClass('electionTracker')}`}>
                  <div className="flex flex-col items-center gap-1">
                    <span>ElectionTracker</span>
                    <Badge variant="default" className="text-xs">Us</Badge>
                  </div>
                </th>
                <th className="text-center p-3 font-semibold">FiveThirtyEight</th>
                <th className="text-center p-3 font-semibold">Ballotpedia</th>
                <th className="text-center p-3 font-semibold">Vote Smart</th>
              </tr>
            </thead>
            <tbody>
              {features.map((feature, idx) => (
                <tr key={idx} className="border-b hover:bg-muted/50">
                  <td className="p-3 font-medium">{feature.name}</td>
                  <td className={`text-center p-3 ${getColumnClass('electionTracker')}`}>
                    {renderValue(feature.electionTracker)}
                  </td>
                  <td className="text-center p-3">
                    {renderValue(feature.fiveThirtyEight)}
                  </td>
                  <td className="text-center p-3">
                    {renderValue(feature.ballotpedia)}
                  </td>
                  <td className="text-center p-3">
                    {renderValue(feature.voteSmart)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Key Advantages */}
        <div className="mt-6 grid md:grid-cols-3 gap-4">
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <h4 className="font-semibold text-green-900 mb-2">Coverage Advantage</h4>
            <p className="text-sm text-green-700">
              3x more elections than FiveThirtyEight, with focus on local races they ignore
            </p>
          </div>
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-semibold text-blue-900 mb-2">Technology Advantage</h4>
            <p className="text-sm text-blue-700">
              Modern 2025 stack vs. competitors using 2010-2020 technology
            </p>
          </div>
          <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
            <h4 className="font-semibold text-purple-900 mb-2">Monetization Advantage</h4>
            <p className="text-sm text-purple-700">
              Candidate portal and API access - revenue streams competitors don't have
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
