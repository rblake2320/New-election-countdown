import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Plus, X, Save } from 'lucide-react';

interface PolicyCategory {
  id: string;
  name: string;
  description: string;
  questions: string[];
}

interface CandidatePolicyFormProps {
  profile: any;
  policyTemplate: PolicyCategory[];
  onUpdate: (data: any) => void;
  isLoading: boolean;
}

export default function CandidatePolicyForm({ profile, policyTemplate, onUpdate, isLoading }: CandidatePolicyFormProps) {
  const [positions, setPositions] = useState({
    economyPosition: profile?.policyPositions?.economy || '',
    healthcarePosition: profile?.policyPositions?.healthcare || '',
    educationPosition: profile?.policyPositions?.education || '',
    environmentPosition: profile?.policyPositions?.environment || '',
    immigrationPosition: profile?.policyPositions?.immigration || '',
    criminalJusticePosition: profile?.policyPositions?.criminalJustice || '',
    infrastructurePosition: profile?.policyPositions?.infrastructure || '',
    taxesPosition: profile?.policyPositions?.taxes || '',
    foreignPolicyPosition: profile?.policyPositions?.foreignPolicy || '',
    socialIssuesPosition: profile?.policyPositions?.socialIssues || '',
  });

  const [topPriorities, setTopPriorities] = useState(profile?.topPriorities || []);

  const updatePosition = (field: string, value: string) => {
    setPositions(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const addPriority = () => {
    setTopPriorities([...topPriorities, { priority: '', description: '' }]);
  };

  const updatePriority = (index: number, field: string, value: string) => {
    const updated = [...topPriorities];
    updated[index] = { ...updated[index], [field]: value };
    setTopPriorities(updated);
  };

  const removePriority = (index: number) => {
    setTopPriorities(topPriorities.filter((_: any, i: number) => i !== index));
  };

  const handleSave = () => {
    const policyData = {
      ...positions,
      topPriorities: topPriorities.filter((priority: any) => priority.priority && priority.description),
    };
    onUpdate(policyData);
  };

  if (!policyTemplate) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <p className="text-gray-600 dark:text-gray-400">Loading policy template...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Priorities */}
      <Card>
        <CardHeader>
          <CardTitle>Campaign Priorities</CardTitle>
          <CardDescription>
            Your top campaign priorities and initiatives. <Badge variant="outline">Candidate Supplied</Badge>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Top Priorities</Label>
              <Button type="button" onClick={addPriority} size="sm" variant="outline">
                <Plus className="h-4 w-4" />
                Add Priority
              </Button>
            </div>
            {topPriorities.map((priority: any, index: number) => (
              <div key={index} className="border p-4 rounded-lg space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="font-medium">Priority {index + 1}</h4>
                  <Button type="button" onClick={() => removePriority(index)} size="sm" variant="ghost">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="space-y-3">
                  <Input
                    placeholder="Priority title (e.g., 'Economic Growth')"
                    value={priority.priority}
                    onChange={(e) => updatePriority(index, 'priority', e.target.value)}
                  />
                  <Textarea
                    placeholder="Detailed description of this priority and your plans..."
                    value={priority.description}
                    onChange={(e) => updatePriority(index, 'description', e.target.value)}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Policy Positions */}
      <Card>
        <CardHeader>
          <CardTitle>Policy Positions</CardTitle>
          <CardDescription>
            Your detailed positions on key policy areas. <Badge variant="outline">Candidate Supplied</Badge>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="economy" className="space-y-4">
            <TabsList className="grid grid-cols-5 w-full">
              <TabsTrigger value="economy">Economy</TabsTrigger>
              <TabsTrigger value="healthcare">Healthcare</TabsTrigger>
              <TabsTrigger value="education">Education</TabsTrigger>
              <TabsTrigger value="environment">Environment</TabsTrigger>
              <TabsTrigger value="social">Social</TabsTrigger>
            </TabsList>

            {/* Economy Tab */}
            <TabsContent value="economy" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <PolicyPositionCard
                  title="Economy & Jobs"
                  description="Economic policy, job creation, business regulation"
                  questions={policyTemplate.find(p => p.id === 'economy')?.questions || []}
                  value={positions.economyPosition}
                  onChange={(value) => updatePosition('economyPosition', value)}
                />
                <PolicyPositionCard
                  title="Taxes"
                  description="Tax policy, government spending, fiscal responsibility"
                  questions={policyTemplate.find(p => p.id === 'taxes')?.questions || []}
                  value={positions.taxesPosition}
                  onChange={(value) => updatePosition('taxesPosition', value)}
                />
              </div>
            </TabsContent>

            {/* Healthcare Tab */}
            <TabsContent value="healthcare" className="space-y-4">
              <PolicyPositionCard
                title="Healthcare"
                description="Healthcare policy, insurance, medical costs"
                questions={policyTemplate.find(p => p.id === 'healthcare')?.questions || []}
                value={positions.healthcarePosition}
                onChange={(value) => updatePosition('healthcarePosition', value)}
              />
            </TabsContent>

            {/* Education Tab */}
            <TabsContent value="education" className="space-y-4">
              <PolicyPositionCard
                title="Education"
                description="Public education, higher education, school funding"
                questions={policyTemplate.find(p => p.id === 'education')?.questions || []}
                value={positions.educationPosition}
                onChange={(value) => updatePosition('educationPosition', value)}
              />
            </TabsContent>

            {/* Environment Tab */}
            <TabsContent value="environment" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <PolicyPositionCard
                  title="Environment"
                  description="Climate change, clean energy, conservation"
                  questions={policyTemplate.find(p => p.id === 'environment')?.questions || []}
                  value={positions.environmentPosition}
                  onChange={(value) => updatePosition('environmentPosition', value)}
                />
                <PolicyPositionCard
                  title="Infrastructure"
                  description="Transportation, broadband, public works"
                  questions={policyTemplate.find(p => p.id === 'infrastructure')?.questions || []}
                  value={positions.infrastructurePosition}
                  onChange={(value) => updatePosition('infrastructurePosition', value)}
                />
              </div>
            </TabsContent>

            {/* Social Tab */}
            <TabsContent value="social" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <PolicyPositionCard
                  title="Immigration"
                  description="Immigration policy, border security, citizenship"
                  questions={policyTemplate.find(p => p.id === 'immigration')?.questions || []}
                  value={positions.immigrationPosition}
                  onChange={(value) => updatePosition('immigrationPosition', value)}
                />
                <PolicyPositionCard
                  title="Criminal Justice"
                  description="Law enforcement, prison reform, public safety"
                  questions={policyTemplate.find(p => p.id === 'criminalJustice')?.questions || []}
                  value={positions.criminalJusticePosition}
                  onChange={(value) => updatePosition('criminalJusticePosition', value)}
                />
                <PolicyPositionCard
                  title="Social Issues"
                  description="Civil rights, equality, social programs"
                  questions={policyTemplate.find(p => p.id === 'socialIssues')?.questions || []}
                  value={positions.socialIssuesPosition}
                  onChange={(value) => updatePosition('socialIssuesPosition', value)}
                />
                <PolicyPositionCard
                  title="Foreign Policy"
                  description="International relations, defense, trade"
                  questions={policyTemplate.find(p => p.id === 'foreignPolicy')?.questions || []}
                  value={positions.foreignPolicyPosition}
                  onChange={(value) => updatePosition('foreignPolicyPosition', value)}
                />
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isLoading} className="flex items-center gap-2">
          <Save className="h-4 w-4" />
          {isLoading ? 'Saving...' : 'Save Policy Positions'}
        </Button>
      </div>
    </div>
  );
}

interface PolicyPositionCardProps {
  title: string;
  description: string;
  questions: string[];
  value: string;
  onChange: (value: string) => void;
}

function PolicyPositionCard({ title, description, questions, value, onChange }: PolicyPositionCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {questions.length > 0 && (
          <div>
            <Label className="text-sm font-medium">Consider these questions:</Label>
            <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-400 mt-1">
              {questions.map((question, index) => (
                <li key={index}>{question}</li>
              ))}
            </ul>
          </div>
        )}
        <div>
          <Label htmlFor={`position-${title.toLowerCase().replace(/\s+/g, '-')}`}>
            Your Position
          </Label>
          <Textarea
            id={`position-${title.toLowerCase().replace(/\s+/g, '-')}`}
            placeholder={`Describe your position on ${title.toLowerCase()}...`}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            rows={4}
          />
        </div>
      </CardContent>
    </Card>
  );
}