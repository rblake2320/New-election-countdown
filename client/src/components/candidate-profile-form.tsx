import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Plus, X, Save } from 'lucide-react';

const profileSchema = z.object({
  fullName: z.string().optional(),
  preferredName: z.string().optional(),
  age: z.number().min(18).max(120).optional(),
  birthPlace: z.string().optional(),
  currentResidence: z.string().optional(),
  familyStatus: z.string().optional(),
  currentOccupation: z.string().optional(),
  militaryService: z.string().optional(),
  politicalExperience: z.string().optional(),
  campaignWebsite: z.string().url().optional().or(z.literal('')),
  campaignSlogan: z.string().optional(),
});

type ProfileForm = z.infer<typeof profileSchema>;

interface CandidateProfileFormProps {
  profile: any;
  onUpdate: (data: any) => void;
  isLoading: boolean;
}

export default function CandidateProfileForm({ profile, onUpdate, isLoading }: CandidateProfileFormProps) {
  const [employmentHistory, setEmploymentHistory] = useState(profile?.employmentHistory || []);
  const [education, setEducation] = useState(profile?.education || []);
  const [previousOffices, setPreviousOffices] = useState(profile?.previousOffices || []);
  const [endorsements, setEndorsements] = useState(profile?.endorsements || []);
  const [keyAccomplishments, setKeyAccomplishments] = useState(profile?.keyAccomplishments || []);

  const form = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: profile?.fullName || '',
      preferredName: profile?.preferredName || '',
      age: profile?.age || undefined,
      birthPlace: profile?.birthPlace || '',
      currentResidence: profile?.currentResidence || '',
      familyStatus: profile?.familyStatus || '',
      currentOccupation: profile?.currentOccupation || '',
      militaryService: profile?.militaryService || '',
      politicalExperience: profile?.politicalExperience || '',
      campaignWebsite: profile?.campaignWebsite || '',
      campaignSlogan: profile?.campaignSlogan || '',
    },
  });

  const addEmployment = () => {
    setEmploymentHistory([...employmentHistory, { company: '', position: '', years: '', description: '' }]);
  };

  const updateEmployment = (index: number, field: string, value: string) => {
    const updated = [...employmentHistory];
    updated[index] = { ...updated[index], [field]: value };
    setEmploymentHistory(updated);
  };

  const removeEmployment = (index: number) => {
    setEmploymentHistory(employmentHistory.filter((_, i) => i !== index));
  };

  const addEducation = () => {
    setEducation([...education, { institution: '', degree: '', year: '', field: '' }]);
  };

  const updateEducation = (index: number, field: string, value: string) => {
    const updated = [...education];
    updated[index] = { ...updated[index], [field]: value };
    setEducation(updated);
  };

  const removeEducation = (index: number) => {
    setEducation(education.filter((_, i) => i !== index));
  };

  const addOffice = () => {
    setPreviousOffices([...previousOffices, { office: '', years: '', achievements: '' }]);
  };

  const updateOffice = (index: number, field: string, value: string) => {
    const updated = [...previousOffices];
    updated[index] = { ...updated[index], [field]: value };
    setPreviousOffices(updated);
  };

  const removeOffice = (index: number) => {
    setPreviousOffices(previousOffices.filter((_, i) => i !== index));
  };

  const addEndorsement = () => {
    setEndorsements([...endorsements, { organization: '', description: '', date: new Date().toISOString().split('T')[0] }]);
  };

  const updateEndorsement = (index: number, field: string, value: string) => {
    const updated = [...endorsements];
    updated[index] = { ...updated[index], [field]: value };
    setEndorsements(updated);
  };

  const removeEndorsement = (index: number) => {
    setEndorsements(endorsements.filter((_, i) => i !== index));
  };

  const addAccomplishment = () => {
    setKeyAccomplishments([...keyAccomplishments, '']);
  };

  const updateAccomplishment = (index: number, value: string) => {
    const updated = [...keyAccomplishments];
    updated[index] = value;
    setKeyAccomplishments(updated);
  };

  const removeAccomplishment = (index: number) => {
    setKeyAccomplishments(keyAccomplishments.filter((_, i) => i !== index));
  };

  const handleSubmit = (data: ProfileForm) => {
    const profileData = {
      ...data,
      employmentHistory: employmentHistory.filter(emp => emp.company && emp.position),
      education: education.filter(edu => edu.institution && edu.degree),
      previousOffices: previousOffices.filter(office => office.office && office.years),
      endorsements: endorsements.filter(end => end.organization && end.description),
      keyAccomplishments: keyAccomplishments.filter(acc => acc.trim()),
    };
    onUpdate(profileData);
  };

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
      {/* Personal Information */}
      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
          <CardDescription>
            Basic information about yourself. <Badge variant="outline">Candidate Supplied</Badge>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="fullName">Full Legal Name</Label>
              <Input {...form.register('fullName')} placeholder="John Doe" />
            </div>
            <div>
              <Label htmlFor="preferredName">Preferred Name</Label>
              <Input {...form.register('preferredName')} placeholder="John" />
            </div>
            <div>
              <Label htmlFor="age">Age</Label>
              <Input {...form.register('age', { valueAsNumber: true })} type="number" placeholder="45" />
            </div>
            <div>
              <Label htmlFor="birthPlace">Birth Place</Label>
              <Input {...form.register('birthPlace')} placeholder="City, State" />
            </div>
            <div>
              <Label htmlFor="currentResidence">Current Residence</Label>
              <Input {...form.register('currentResidence')} placeholder="City, State" />
            </div>
            <div>
              <Label htmlFor="familyStatus">Family Status</Label>
              <Input {...form.register('familyStatus')} placeholder="Married with 2 children" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Professional Background */}
      <Card>
        <CardHeader>
          <CardTitle>Professional Background</CardTitle>
          <CardDescription>
            Your career and work experience. <Badge variant="outline">Candidate Supplied</Badge>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="currentOccupation">Current Occupation</Label>
            <Input {...form.register('currentOccupation')} placeholder="e.g., Attorney, Business Owner" />
          </div>

          {/* Employment History */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label>Employment History</Label>
              <Button type="button" onClick={addEmployment} size="sm" variant="outline">
                <Plus className="h-4 w-4" />
                Add Position
              </Button>
            </div>
            {employmentHistory.map((emp, index) => (
              <div key={index} className="border p-4 rounded-lg space-y-3 mb-3">
                <div className="flex justify-between items-center">
                  <h4 className="font-medium">Position {index + 1}</h4>
                  <Button type="button" onClick={() => removeEmployment(index)} size="sm" variant="ghost">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Input
                    placeholder="Company/Organization"
                    value={emp.company}
                    onChange={(e) => updateEmployment(index, 'company', e.target.value)}
                  />
                  <Input
                    placeholder="Position Title"
                    value={emp.position}
                    onChange={(e) => updateEmployment(index, 'position', e.target.value)}
                  />
                  <Input
                    placeholder="Years (e.g., 2018-2022)"
                    value={emp.years}
                    onChange={(e) => updateEmployment(index, 'years', e.target.value)}
                  />
                </div>
                <Textarea
                  placeholder="Description of responsibilities and achievements"
                  value={emp.description}
                  onChange={(e) => updateEmployment(index, 'description', e.target.value)}
                />
              </div>
            ))}
          </div>

          {/* Education */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label>Education</Label>
              <Button type="button" onClick={addEducation} size="sm" variant="outline">
                <Plus className="h-4 w-4" />
                Add Education
              </Button>
            </div>
            {education.map((edu, index) => (
              <div key={index} className="border p-4 rounded-lg space-y-3 mb-3">
                <div className="flex justify-between items-center">
                  <h4 className="font-medium">Education {index + 1}</h4>
                  <Button type="button" onClick={() => removeEducation(index)} size="sm" variant="ghost">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Input
                    placeholder="Institution"
                    value={edu.institution}
                    onChange={(e) => updateEducation(index, 'institution', e.target.value)}
                  />
                  <Input
                    placeholder="Degree/Program"
                    value={edu.degree}
                    onChange={(e) => updateEducation(index, 'degree', e.target.value)}
                  />
                  <Input
                    placeholder="Year Completed"
                    value={edu.year}
                    onChange={(e) => updateEducation(index, 'year', e.target.value)}
                  />
                  <Input
                    placeholder="Field of Study"
                    value={edu.field}
                    onChange={(e) => updateEducation(index, 'field', e.target.value)}
                  />
                </div>
              </div>
            ))}
          </div>

          <div>
            <Label htmlFor="militaryService">Military Service</Label>
            <Textarea {...form.register('militaryService')} placeholder="Describe any military service..." />
          </div>
        </CardContent>
      </Card>

      {/* Political Experience */}
      <Card>
        <CardHeader>
          <CardTitle>Political Experience</CardTitle>
          <CardDescription>
            Your political background and experience. <Badge variant="outline">Candidate Supplied</Badge>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="politicalExperience">Political Experience Overview</Label>
            <Textarea {...form.register('politicalExperience')} placeholder="Describe your political background..." />
          </div>

          {/* Previous Offices */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label>Previous Elected Offices</Label>
              <Button type="button" onClick={addOffice} size="sm" variant="outline">
                <Plus className="h-4 w-4" />
                Add Office
              </Button>
            </div>
            {previousOffices.map((office, index) => (
              <div key={index} className="border p-4 rounded-lg space-y-3 mb-3">
                <div className="flex justify-between items-center">
                  <h4 className="font-medium">Office {index + 1}</h4>
                  <Button type="button" onClick={() => removeOffice(index)} size="sm" variant="ghost">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Input
                    placeholder="Office Title"
                    value={office.office}
                    onChange={(e) => updateOffice(index, 'office', e.target.value)}
                  />
                  <Input
                    placeholder="Years Served"
                    value={office.years}
                    onChange={(e) => updateOffice(index, 'years', e.target.value)}
                  />
                </div>
                <Textarea
                  placeholder="Key achievements and accomplishments"
                  value={office.achievements}
                  onChange={(e) => updateOffice(index, 'achievements', e.target.value)}
                />
              </div>
            ))}
          </div>

          {/* Endorsements */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label>Endorsements</Label>
              <Button type="button" onClick={addEndorsement} size="sm" variant="outline">
                <Plus className="h-4 w-4" />
                Add Endorsement
              </Button>
            </div>
            {endorsements.map((end, index) => (
              <div key={index} className="border p-4 rounded-lg space-y-3 mb-3">
                <div className="flex justify-between items-center">
                  <h4 className="font-medium">Endorsement {index + 1}</h4>
                  <Button type="button" onClick={() => removeEndorsement(index)} size="sm" variant="ghost">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Input
                    placeholder="Organization/Person"
                    value={end.organization}
                    onChange={(e) => updateEndorsement(index, 'organization', e.target.value)}
                  />
                  <Input
                    placeholder="Date"
                    type="date"
                    value={end.date}
                    onChange={(e) => updateEndorsement(index, 'date', e.target.value)}
                  />
                </div>
                <Textarea
                  placeholder="Endorsement description or quote"
                  value={end.description}
                  onChange={(e) => updateEndorsement(index, 'description', e.target.value)}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Campaign Information */}
      <Card>
        <CardHeader>
          <CardTitle>Campaign Information</CardTitle>
          <CardDescription>
            Information about your current campaign. <Badge variant="outline">Candidate Supplied</Badge>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="campaignWebsite">Campaign Website</Label>
            <Input {...form.register('campaignWebsite')} type="url" placeholder="https://yourname.com" />
            {form.formState.errors.campaignWebsite && (
              <p className="text-sm text-red-600">{form.formState.errors.campaignWebsite.message}</p>
            )}
          </div>
          
          <div>
            <Label htmlFor="campaignSlogan">Campaign Slogan</Label>
            <Input {...form.register('campaignSlogan')} placeholder="Your campaign slogan or tagline" />
          </div>

          {/* Key Accomplishments */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label>Key Accomplishments</Label>
              <Button type="button" onClick={addAccomplishment} size="sm" variant="outline">
                <Plus className="h-4 w-4" />
                Add Accomplishment
              </Button>
            </div>
            {keyAccomplishments.map((acc, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <Input
                  placeholder="Key accomplishment or achievement"
                  value={acc}
                  onChange={(e) => updateAccomplishment(index, e.target.value)}
                />
                <Button type="button" onClick={() => removeAccomplishment(index)} size="sm" variant="ghost">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={isLoading} className="flex items-center gap-2">
          <Save className="h-4 w-4" />
          {isLoading ? 'Saving...' : 'Save Profile'}
        </Button>
      </div>
    </form>
  );
}