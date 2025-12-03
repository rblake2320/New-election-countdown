import fs from 'fs';

// Read the JSON file
const data = JSON.parse(fs.readFileSync('attached_assets/congress_members_complete.json', 'utf8'));
const supplement = JSON.parse(fs.readFileSync('attached_assets/missing_members_supplement.json', 'utf8'));

console.log('=== ANALYSIS OF CONGRESSIONAL DATASET ===\n');

// Combine datasets
const allMembers = [...data, ...supplement];

// Count by chamber
const houseMembers = allMembers.filter(m => m.chamber === 'House');
const senateMembers = allMembers.filter(m => m.chamber === 'Senate');

console.log(`Total members: ${allMembers.length}`);
console.log(`House: ${houseMembers.length} (expected: 435)`);
console.log(`Senate: ${senateMembers.length} (expected: 100)`);

// Count by state for senators (should be exactly 2 per state)
const senateByState = {};
senateMembers.forEach(senator => {
  senateByState[senator.state] = (senateByState[senator.state] || 0) + 1;
});

console.log('\n=== SENATE ANALYSIS ===');
const statesWithWrongSenatorCount = [];
Object.entries(senateByState).forEach(([state, count]) => {
  if (count !== 2) {
    statesWithWrongSenatorCount.push(`${state}: ${count} senators`);
  }
});

if (statesWithWrongSenatorCount.length > 0) {
  console.log('States with incorrect senator count:');
  statesWithWrongSenatorCount.forEach(s => console.log(`  ${s}`));
} else {
  console.log('All states have exactly 2 senators');
}

// Count vacant seats
const vacantSeats = allMembers.filter(m => m.full_name === '(vacant)');
console.log(`\nVacant seats: ${vacantSeats.length}`);
vacantSeats.forEach(seat => {
  console.log(`  ${seat.state}-${seat.district} (${seat.chamber})`);
});

// Count by party
const partyCount = {};
allMembers.forEach(member => {
  const party = member.party || 'Unknown';
  partyCount[party] = (partyCount[party] || 0) + 1;
});

console.log('\n=== PARTY BREAKDOWN ===');
Object.entries(partyCount).forEach(([party, count]) => {
  console.log(`${party}: ${count}`);
});