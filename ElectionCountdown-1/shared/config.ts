export interface ElectionVersion {
  id: string;
  name: string;
  description: string;
  targetDate: string;
  route: string;
  isActive: boolean;
}

export const ELECTION_VERSIONS: ElectionVersion[] = [
  {
    id: 'midterm-2026',
    name: '2026 Midterm Elections',
    description: 'All elections from now through November 2026',
    targetDate: '2026-11-03',
    route: '/midterm-2026',
    isActive: true
  },
  {
    id: 'presidential-2028',
    name: '2028 Presidential Election',
    description: 'Complete tracking for the 2028 presidential race',
    targetDate: '2028-11-07',
    route: '/presidential-2028',
    isActive: false
  }
];

export const getCurrentVersion = (): ElectionVersion => {
  return ELECTION_VERSIONS.find(v => v.isActive) || ELECTION_VERSIONS[0];
};

export const getVersionById = (id: string): ElectionVersion | undefined => {
  return ELECTION_VERSIONS.find(v => v.id === id);
};