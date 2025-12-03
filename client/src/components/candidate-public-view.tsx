import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ExternalLink, MapPin, Calendar, Award, Briefcase, GraduationCap, Users } from 'lucide-react';

interface CandidatePublicViewProps {
  candidate: any;
}

export default function CandidatePublicView({ candidate }: CandidatePublicViewProps) {
  if (!candidate) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <p className="text-gray-600 dark:text-gray-400">Loading candidate profile...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getAttributionBadge = (fieldName: string) => {
    const attribution = candidate.getDataAttribution ? candidate.getDataAttribution(fieldName) : 'Unknown Source';
    
    if (attribution === 'Candidate Supplied') {
      return <Badge variant="default" className="text-xs">Candidate Supplied</Badge>;
    } else if (attribution === 'AI Researched') {
      return <Badge variant="secondary" className="text-xs">AI Researched</Badge>;
    } else if (attribution.startsWith('Verified:')) {
      return <Badge variant="outline" className="text-xs">Verified</Badge>;
    } else {
      return <Badge variant="destructive" className="text-xs">Not Available</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl">
                {candidate.preferredName || candidate.fullName || candidate.name}
                {getAttributionBadge('fullName')}
              </CardTitle>
              <CardDescription className="text-lg">
                {candidate.party} Candidate
              </CardDescription>
              {candidate.campaignSlogan && (
                <p className="italic text-gray-600 dark:text-gray-400 mt-2">
                  "{candidate.campaignSlogan}" {getAttributionBadge('campaignSlogan')}
                </p>
              )}
            </div>
            {candidate.campaignWebsite && (
              <Button variant="outline" asChild>
                <a href={candidate.campaignWebsite} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Campaign Website
                </a>
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            {candidate.age && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <span>Age: {candidate.age}</span>
                {getAttributionBadge('age')}
              </div>
            )}
            {candidate.currentResidence && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-gray-500" />
                <span>{candidate.currentResidence}</span>
                {getAttributionBadge('currentResidence')}
              </div>
            )}
            {candidate.currentOccupation && (
              <div className="flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-gray-500" />
                <span>{candidate.currentOccupation}</span>
                {getAttributionBadge('currentOccupation')}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Background */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Background
              {getAttributionBadge('politicalExperience')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 dark:text-gray-300">
              {candidate.background || candidate.politicalExperience || 'Candidate has not supplied that info'}
            </p>
            
            {candidate.familyStatus && (
              <div className="mt-4">
                <h4 className="font-semibold mb-2">Personal</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {candidate.familyStatus} {getAttributionBadge('familyStatus')}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Education */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5" />
              Education
              {getAttributionBadge('education')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {candidate.education && candidate.education.length > 0 ? (
              <div className="space-y-3">
                {candidate.education.map((edu: any, index: number) => (
                  <div key={index} className="border-l-2 border-blue-200 pl-4">
                    <h4 className="font-semibold">{edu.degree}</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {edu.institution} • {edu.year}
                    </p>
                    {edu.field && (
                      <p className="text-sm text-gray-500">{edu.field}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-600 dark:text-gray-400">
                Candidate has not supplied that info
              </p>
            )}
          </CardContent>
        </Card>

        {/* Professional Experience */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Professional Experience
              {getAttributionBadge('employmentHistory')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {candidate.employmentHistory && candidate.employmentHistory.length > 0 ? (
              <div className="space-y-3">
                {candidate.employmentHistory.map((job: any, index: number) => (
                  <div key={index} className="border-l-2 border-green-200 pl-4">
                    <h4 className="font-semibold">{job.position}</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {job.company} • {job.years}
                    </p>
                    {job.description && (
                      <p className="text-sm text-gray-500 mt-1">{job.description}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-600 dark:text-gray-400">
                Candidate has not supplied that info
              </p>
            )}
          </CardContent>
        </Card>

        {/* Political Experience */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Political Experience
              {getAttributionBadge('previousOffices')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {candidate.previousOffices && candidate.previousOffices.length > 0 ? (
              <div className="space-y-3">
                {candidate.previousOffices.map((office: any, index: number) => (
                  <div key={index} className="border-l-2 border-purple-200 pl-4">
                    <h4 className="font-semibold">{office.office}</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {office.years}
                    </p>
                    {office.achievements && (
                      <p className="text-sm text-gray-500 mt-1">{office.achievements}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-600 dark:text-gray-400">
                {candidate.militaryService || 'Candidate has not supplied that info'}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Priorities */}
      {candidate.topPriorities && candidate.topPriorities.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Campaign Priorities {getAttributionBadge('topPriorities')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {candidate.topPriorities.map((priority: any, index: number) => (
                <div key={index} className="p-4 border rounded-lg">
                  <h4 className="font-semibold mb-2">{priority.priority}</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {priority.description}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Policy Positions */}
      {candidate.policyPositions && (
        <Card>
          <CardHeader>
            <CardTitle>Policy Positions</CardTitle>
            <CardDescription>
              Candidate's positions on key issues {getAttributionBadge('policyPositions')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(candidate.policyPositions).map(([key, value]) => {
                if (!value) return null;
                const title = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).replace('Position', '');
                return (
                  <div key={key} className="p-4 border rounded-lg">
                    <h4 className="font-semibold mb-2">{title}</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {String(value).length > 100 ? `${String(value).substring(0, 100)}...` : String(value)}
                    </p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Endorsements */}
      {candidate.endorsements && candidate.endorsements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Endorsements {getAttributionBadge('endorsements')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {candidate.endorsements.map((endorsement: any, index: number) => (
                <div key={index} className="border-l-4 border-blue-500 pl-4">
                  <h4 className="font-semibold">{endorsement.organization}</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {endorsement.description}
                  </p>
                  {endorsement.date && (
                    <p className="text-xs text-gray-500">{endorsement.date}</p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Key Accomplishments */}
      {candidate.keyAccomplishments && candidate.keyAccomplishments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Key Accomplishments {getAttributionBadge('keyAccomplishments')}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {candidate.keyAccomplishments.map((accomplishment: string, index: number) => (
                <li key={index} className="flex items-start gap-2">
                  <Award className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">{accomplishment}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Data Verification Footer */}
      <Card className="bg-gray-50 dark:bg-gray-800">
        <CardContent className="p-4">
          <div className="flex items-center justify-between text-sm">
            <div>
              <p className="font-medium">Data Transparency</p>
              <p className="text-gray-600 dark:text-gray-400">
                Profile Completion: {candidate.dataCompleteness || 0}% • 
                Status: {candidate.verificationStatus || 'Pending'}
              </p>
            </div>
            <div className="flex gap-2">
              <Badge variant="default">Candidate Supplied</Badge>
              <Badge variant="secondary">AI Researched</Badge>
              <Badge variant="outline">Verified</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}