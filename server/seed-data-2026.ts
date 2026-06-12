/**
 * Verified 2026 election cycle data.
 * Compiled 2026-06-11 from Ballotpedia, NCSL, state Secretary of State sites,
 * AP/NPR/CNN, and Cook Political Report. Every entry was source-verified —
 * null candidate fields mean "primary not yet decided", never invented data.
 *
 * Election day: November 3, 2026.
 */

export interface SeedRace {
  state: string;
  title: string;
  subtitle: string;
  type: "general" | "special" | "primary" | "runoff";
  level: "federal" | "state" | "local";
  office: string;
  date: string; // ISO date
  description: string;
  candidates: SeedCandidate[];
}

export interface SeedCandidate {
  name: string;
  party: string; // 'D' | 'R' | 'I' | 'L' | ...
  isIncumbent: boolean;
  description: string;
}

const E_DAY = "2026-11-03";

// ── U.S. Senate: 33 Class II regular + 2 specials (FL, OH) ──
export const SENATE_RACES: SeedRace[] = [
  { state: "AL", title: "U.S. Senate Election - Alabama", subtitle: "Open Seat (Tuberville running for Governor)", type: "general", level: "federal", office: "U.S. Senate", date: E_DAY, description: "Open seat — incumbent Tommy Tuberville (R) is running for governor. Nominees decided in June 16 runoffs.", candidates: [] },
  { state: "AK", title: "U.S. Senate Election - Alaska", subtitle: "Class II Seat — ranked-choice general", type: "general", level: "federal", office: "U.S. Senate", date: E_DAY, description: "Incumbent Dan Sullivan (R) seeks re-election; Mary Peltola (D) entry makes this a toss-up. Top-four primary Aug 18.", candidates: [
    { name: "Dan Sullivan", party: "R", isIncumbent: true, description: "Incumbent U.S. Senator seeking a third term." },
    { name: "Mary Peltola", party: "D", isIncumbent: false, description: "Former U.S. Representative for Alaska at-large." },
  ]},
  { state: "AR", title: "U.S. Senate Election - Arkansas", subtitle: "Class II Seat", type: "general", level: "federal", office: "U.S. Senate", date: E_DAY, description: "Incumbent Tom Cotton (R) seeks re-election.", candidates: [
    { name: "Tom Cotton", party: "R", isIncumbent: true, description: "Incumbent U.S. Senator seeking a third term." },
  ]},
  { state: "CO", title: "U.S. Senate Election - Colorado", subtitle: "Class II Seat", type: "general", level: "federal", office: "U.S. Senate", date: E_DAY, description: "Incumbent John Hickenlooper (D) seeks re-election. Primary June 30.", candidates: [
    { name: "John Hickenlooper", party: "D", isIncumbent: true, description: "Incumbent U.S. Senator and former Colorado governor." },
  ]},
  { state: "DE", title: "U.S. Senate Election - Delaware", subtitle: "Class II Seat", type: "general", level: "federal", office: "U.S. Senate", date: E_DAY, description: "Incumbent Chris Coons (D) seeks re-election. Primary September 15.", candidates: [
    { name: "Chris Coons", party: "D", isIncumbent: true, description: "Incumbent U.S. Senator seeking a fourth term." },
  ]},
  { state: "FL", title: "U.S. Senate Special Election - Florida", subtitle: "Special Election (Rubio vacancy)", type: "special", level: "federal", office: "U.S. Senate", date: E_DAY, description: "Special election for the seat vacated by Marco Rubio (now Secretary of State). Appointed Sen. Ashley Moody (R) runs; Democratic primary Aug 18 features Alexander Vindman and Angie Nixon.", candidates: [
    { name: "Ashley Moody", party: "R", isIncumbent: true, description: "Appointed U.S. Senator and former Florida Attorney General." },
    { name: "Alexander Vindman", party: "D", isIncumbent: false, description: "Retired Army officer; Democratic primary frontrunner." },
    { name: "Angie Nixon", party: "D", isIncumbent: false, description: "Florida state representative from Jacksonville; Democratic primary candidate." },
  ]},
  { state: "GA", title: "U.S. Senate Election - Georgia", subtitle: "Class II Seat", type: "general", level: "federal", office: "U.S. Senate", date: E_DAY, description: "Incumbent Jon Ossoff (D) seeks a second term. GOP runoff June 16: Mike Collins vs Derek Dooley.", candidates: [
    { name: "Jon Ossoff", party: "D", isIncumbent: true, description: "Incumbent U.S. Senator seeking a second term." },
    { name: "Mike Collins", party: "R", isIncumbent: false, description: "U.S. Representative (GA-10); leads the June 16 GOP runoff." },
    { name: "Derek Dooley", party: "R", isIncumbent: false, description: "Former Tennessee football head coach; June 16 GOP runoff candidate." },
  ]},
  { state: "ID", title: "U.S. Senate Election - Idaho", subtitle: "Class II Seat", type: "general", level: "federal", office: "U.S. Senate", date: E_DAY, description: "Incumbent Jim Risch (R) seeks re-election.", candidates: [
    { name: "Jim Risch", party: "R", isIncumbent: true, description: "Incumbent U.S. Senator seeking a fourth term." },
    { name: "David Roth", party: "D", isIncumbent: false, description: "Democratic nominee." },
  ]},
  { state: "IL", title: "U.S. Senate Election - Illinois", subtitle: "Open Seat (Durbin retiring)", type: "general", level: "federal", office: "U.S. Senate", date: E_DAY, description: "Open seat — Dick Durbin (D) is retiring. Lt. Gov. Juliana Stratton won the Democratic primary.", candidates: [
    { name: "Juliana Stratton", party: "D", isIncumbent: false, description: "Illinois Lieutenant Governor; Democratic nominee." },
  ]},
  { state: "IA", title: "U.S. Senate Election - Iowa", subtitle: "Open Seat (Ernst retiring)", type: "general", level: "federal", office: "U.S. Senate", date: E_DAY, description: "Open seat — Joni Ernst (R) is retiring. Confirmed nominees from June 2 primaries.", candidates: [
    { name: "Ashley Hinson", party: "R", isIncumbent: false, description: "U.S. Representative (IA-02); Republican nominee." },
    { name: "Josh Turek", party: "D", isIncumbent: false, description: "State representative and Paralympic gold medalist; Democratic nominee." },
  ]},
  { state: "KS", title: "U.S. Senate Election - Kansas", subtitle: "Class II Seat", type: "general", level: "federal", office: "U.S. Senate", date: E_DAY, description: "Incumbent Roger Marshall (R) seeks re-election. Primary Aug 4.", candidates: [
    { name: "Roger Marshall", party: "R", isIncumbent: true, description: "Incumbent U.S. Senator seeking a second term." },
  ]},
  { state: "KY", title: "U.S. Senate Election - Kentucky", subtitle: "Open Seat (McConnell retiring)", type: "general", level: "federal", office: "U.S. Senate", date: E_DAY, description: "Open seat — Mitch McConnell (R) is retiring after seven terms. Confirmed nominees from May 19 primaries.", candidates: [
    { name: "Andy Barr", party: "R", isIncumbent: false, description: "U.S. Representative (KY-06); Republican nominee." },
    { name: "Charles Booker", party: "D", isIncumbent: false, description: "Former state representative; Democratic nominee." },
  ]},
  { state: "LA", title: "U.S. Senate Election - Louisiana", subtitle: "Class II Seat (Cassidy lost renomination)", type: "general", level: "federal", office: "U.S. Senate", date: E_DAY, description: "Incumbent Bill Cassidy (R) was eliminated in the May 16 closed primary. Runoffs June 27: GOP Julia Letlow vs John Fleming; Dem Gary Crockett vs Jamie Davis.", candidates: [] },
  { state: "ME", title: "U.S. Senate Election - Maine", subtitle: "Class II Seat — most competitive race on the map", type: "general", level: "federal", office: "U.S. Senate", date: E_DAY, description: "Incumbent Susan Collins (R) seeks a sixth term against Democratic primary winner Graham Platner.", candidates: [
    { name: "Susan Collins", party: "R", isIncumbent: true, description: "Incumbent U.S. Senator seeking a sixth term." },
    { name: "Graham Platner", party: "D", isIncumbent: false, description: "Marine and Army combat veteran and oyster farmer; Democratic nominee." },
  ]},
  { state: "MA", title: "U.S. Senate Election - Massachusetts", subtitle: "Class II Seat", type: "general", level: "federal", office: "U.S. Senate", date: E_DAY, description: "Incumbent Ed Markey (D) seeks re-election. Primary September 1.", candidates: [
    { name: "Ed Markey", party: "D", isIncumbent: true, description: "Incumbent U.S. Senator seeking a third full term." },
  ]},
  { state: "MI", title: "U.S. Senate Election - Michigan", subtitle: "Open Seat (Peters retiring)", type: "general", level: "federal", office: "U.S. Senate", date: E_DAY, description: "Open seat — Gary Peters (D) is retiring. Democratic primary Aug 4: Abdul El-Sayed, Mallory McMorrow, Haley Stevens. Mike Rogers leads the GOP field.", candidates: [
    { name: "Mike Rogers", party: "R", isIncumbent: false, description: "Former U.S. Representative and House Intelligence Committee chair; GOP frontrunner." },
    { name: "Abdul El-Sayed", party: "D", isIncumbent: false, description: "Physician and former Detroit health director; Aug 4 Democratic primary candidate." },
    { name: "Mallory McMorrow", party: "D", isIncumbent: false, description: "Michigan state senator; Aug 4 Democratic primary candidate." },
    { name: "Haley Stevens", party: "D", isIncumbent: false, description: "U.S. Representative (MI-11); Aug 4 Democratic primary candidate." },
  ]},
  { state: "MN", title: "U.S. Senate Election - Minnesota", subtitle: "Open Seat (Smith retiring)", type: "general", level: "federal", office: "U.S. Senate", date: E_DAY, description: "Open seat — Tina Smith (D) is retiring. Democratic primary Aug 11: Lt. Gov. Peggy Flanagan vs Rep. Angie Craig.", candidates: [
    { name: "Peggy Flanagan", party: "D", isIncumbent: false, description: "Minnesota Lieutenant Governor; won DFL endorsement." },
    { name: "Angie Craig", party: "D", isIncumbent: false, description: "U.S. Representative (MN-02); Aug 11 Democratic primary candidate." },
  ]},
  { state: "MS", title: "U.S. Senate Election - Mississippi", subtitle: "Class II Seat", type: "general", level: "federal", office: "U.S. Senate", date: E_DAY, description: "Incumbent Cindy Hyde-Smith (R) seeks re-election.", candidates: [
    { name: "Cindy Hyde-Smith", party: "R", isIncumbent: true, description: "Incumbent U.S. Senator seeking a second full term." },
    { name: "Scott Colom", party: "D", isIncumbent: false, description: "District attorney; Democratic nominee." },
  ]},
  { state: "MT", title: "U.S. Senate Election - Montana", subtitle: "Open Seat (Daines withdrew)", type: "general", level: "federal", office: "U.S. Senate", date: E_DAY, description: "Open seat — Steve Daines (R) withdrew at the filing deadline and endorsed Kurt Alme. Independent Seth Bodnar also running.", candidates: [
    { name: "Kurt Alme", party: "R", isIncumbent: false, description: "Former U.S. Attorney for Montana; Republican nominee." },
    { name: "Alani Bankhead", party: "D", isIncumbent: false, description: "Democratic nominee." },
    { name: "Seth Bodnar", party: "I", isIncumbent: false, description: "Former University of Montana president; Independent candidate." },
  ]},
  { state: "NE", title: "U.S. Senate Election - Nebraska", subtitle: "Class II Seat", type: "general", level: "federal", office: "U.S. Senate", date: E_DAY, description: "Pete Ricketts (R) seeks his first full term. Independent Dan Osborn is the main challenger; polls show a statistical tie.", candidates: [
    { name: "Pete Ricketts", party: "R", isIncumbent: true, description: "Incumbent U.S. Senator seeking his first full term." },
    { name: "Dan Osborn", party: "I", isIncumbent: false, description: "Industrial mechanic and union leader; Independent candidate." },
  ]},
  { state: "NH", title: "U.S. Senate Election - New Hampshire", subtitle: "Open Seat (Shaheen retiring)", type: "general", level: "federal", office: "U.S. Senate", date: E_DAY, description: "Open seat — Jeanne Shaheen (D) is retiring. Rep. Chris Pappas is the Democratic frontrunner; GOP primary Sep 8 features John E. Sununu and Scott Brown.", candidates: [
    { name: "Chris Pappas", party: "D", isIncumbent: false, description: "U.S. Representative (NH-01); Democratic frontrunner." },
    { name: "John E. Sununu", party: "R", isIncumbent: false, description: "Former U.S. Senator; Sep 8 GOP primary candidate." },
    { name: "Scott Brown", party: "R", isIncumbent: false, description: "Former U.S. Senator from Massachusetts; Sep 8 GOP primary candidate." },
  ]},
  { state: "NJ", title: "U.S. Senate Election - New Jersey", subtitle: "Class II Seat", type: "general", level: "federal", office: "U.S. Senate", date: E_DAY, description: "Incumbent Cory Booker (D) seeks re-election.", candidates: [
    { name: "Cory Booker", party: "D", isIncumbent: true, description: "Incumbent U.S. Senator seeking a third full term." },
  ]},
  { state: "NM", title: "U.S. Senate Election - New Mexico", subtitle: "Class II Seat", type: "general", level: "federal", office: "U.S. Senate", date: E_DAY, description: "Incumbent Ben Ray Luján (D) seeks re-election.", candidates: [
    { name: "Ben Ray Luján", party: "D", isIncumbent: true, description: "Incumbent U.S. Senator seeking a second term." },
  ]},
  { state: "NC", title: "U.S. Senate Election - North Carolina", subtitle: "Open Seat (Tillis retiring)", type: "general", level: "federal", office: "U.S. Senate", date: E_DAY, description: "Open seat — Thom Tillis (R) is retiring. Former Gov. Roy Cooper (D) faces former RNC chair Michael Whatley (R).", candidates: [
    { name: "Roy Cooper", party: "D", isIncumbent: false, description: "Former two-term Governor of North Carolina; Democratic nominee." },
    { name: "Michael Whatley", party: "R", isIncumbent: false, description: "Former Republican National Committee chairman; Republican nominee." },
  ]},
  { state: "OH", title: "U.S. Senate Special Election - Ohio", subtitle: "Special Election (Vance vacancy)", type: "special", level: "federal", office: "U.S. Senate", date: E_DAY, description: "Special election for JD Vance's former seat. Appointed Sen. Jon Husted (R) faces former Sen. Sherrod Brown (D).", candidates: [
    { name: "Jon Husted", party: "R", isIncumbent: true, description: "Appointed U.S. Senator and former Ohio Lieutenant Governor." },
    { name: "Sherrod Brown", party: "D", isIncumbent: false, description: "Former three-term U.S. Senator; Democratic nominee." },
  ]},
  { state: "OK", title: "U.S. Senate Special Election - Oklahoma", subtitle: "Open Seat (Mullin resigned)", type: "special", level: "federal", office: "U.S. Senate", date: E_DAY, description: "Markwayne Mullin resigned in March 2026 to become DHS Secretary; appointee Alan Armstrong is barred from running. Open GOP primary June 16.", candidates: [] },
  { state: "OR", title: "U.S. Senate Election - Oregon", subtitle: "Class II Seat", type: "general", level: "federal", office: "U.S. Senate", date: E_DAY, description: "Incumbent Jeff Merkley (D) seeks re-election.", candidates: [
    { name: "Jeff Merkley", party: "D", isIncumbent: true, description: "Incumbent U.S. Senator seeking a fourth term." },
  ]},
  { state: "RI", title: "U.S. Senate Election - Rhode Island", subtitle: "Class II Seat", type: "general", level: "federal", office: "U.S. Senate", date: E_DAY, description: "Incumbent Jack Reed (D) seeks re-election. Primary in September.", candidates: [
    { name: "Jack Reed", party: "D", isIncumbent: true, description: "Incumbent U.S. Senator seeking a sixth term." },
  ]},
  { state: "SC", title: "U.S. Senate Election - South Carolina", subtitle: "Class II Seat", type: "general", level: "federal", office: "U.S. Senate", date: E_DAY, description: "Incumbent Lindsey Graham (R) faces Democratic nominee Annie Andrews. Both confirmed June 9.", candidates: [
    { name: "Lindsey Graham", party: "R", isIncumbent: true, description: "Incumbent U.S. Senator seeking a fifth term." },
    { name: "Annie Andrews", party: "D", isIncumbent: false, description: "Pediatrician; Democratic nominee." },
  ]},
  { state: "SD", title: "U.S. Senate Election - South Dakota", subtitle: "Class II Seat", type: "general", level: "federal", office: "U.S. Senate", date: E_DAY, description: "Incumbent Mike Rounds (R) seeks re-election.", candidates: [
    { name: "Mike Rounds", party: "R", isIncumbent: true, description: "Incumbent U.S. Senator seeking a third term." },
  ]},
  { state: "TN", title: "U.S. Senate Election - Tennessee", subtitle: "Class II Seat", type: "general", level: "federal", office: "U.S. Senate", date: E_DAY, description: "Incumbent Bill Hagerty (R) seeks re-election. Primary Aug 6.", candidates: [
    { name: "Bill Hagerty", party: "R", isIncumbent: true, description: "Incumbent U.S. Senator seeking a second term." },
  ]},
  { state: "TX", title: "U.S. Senate Election - Texas", subtitle: "Class II Seat (Cornyn lost renomination)", type: "general", level: "federal", office: "U.S. Senate", date: E_DAY, description: "John Cornyn lost the GOP runoff to AG Ken Paxton. Paxton faces Democratic nominee James Talarico. Rated a toss-up.", candidates: [
    { name: "Ken Paxton", party: "R", isIncumbent: false, description: "Texas Attorney General; defeated Sen. John Cornyn in the GOP runoff." },
    { name: "James Talarico", party: "D", isIncumbent: false, description: "Texas state representative and former teacher; Democratic nominee." },
  ]},
  { state: "VA", title: "U.S. Senate Election - Virginia", subtitle: "Class II Seat", type: "general", level: "federal", office: "U.S. Senate", date: E_DAY, description: "Incumbent Mark Warner (D) seeks re-election. Primary Aug 4.", candidates: [
    { name: "Mark Warner", party: "D", isIncumbent: true, description: "Incumbent U.S. Senator seeking a fourth term." },
  ]},
  { state: "WV", title: "U.S. Senate Election - West Virginia", subtitle: "Class II Seat", type: "general", level: "federal", office: "U.S. Senate", date: E_DAY, description: "Incumbent Shelley Moore Capito (R) seeks re-election.", candidates: [
    { name: "Shelley Moore Capito", party: "R", isIncumbent: true, description: "Incumbent U.S. Senator seeking a third term." },
  ]},
  { state: "WY", title: "U.S. Senate Election - Wyoming", subtitle: "Open Seat (Lummis retiring)", type: "general", level: "federal", office: "U.S. Senate", date: E_DAY, description: "Open seat — Cynthia Lummis (R) is retiring. Rep. Harriet Hageman is the clear GOP frontrunner; primary Aug 18.", candidates: [
    { name: "Harriet Hageman", party: "R", isIncumbent: false, description: "U.S. Representative for Wyoming at-large; GOP frontrunner." },
  ]},
];

// ── Governorships: 36 states ──
export const GOVERNOR_RACES: SeedRace[] = [
  { state: "AL", title: "Alabama Gubernatorial Election", subtitle: "Open Seat (Ivey term-limited)", type: "general", level: "state", office: "Governor", date: E_DAY, description: "2020 Senate rematch: Sen. Tommy Tuberville (R) vs former Sen. Doug Jones (D).", candidates: [
    { name: "Tommy Tuberville", party: "R", isIncumbent: false, description: "U.S. Senator and former Auburn football coach; Republican nominee." },
    { name: "Doug Jones", party: "D", isIncumbent: false, description: "Former U.S. Senator; Democratic nominee." },
  ]},
  { state: "AK", title: "Alaska Gubernatorial Election", subtitle: "Open Seat (Dunleavy term-limited)", type: "general", level: "state", office: "Governor", date: E_DAY, description: "Open seat with a large field including independents Bill Walker and Lesil McGuire. Top-four primary Aug 18, ranked-choice general.", candidates: [] },
  { state: "AZ", title: "Arizona Gubernatorial Election", subtitle: "Governor Race — top GOP target", type: "general", level: "state", office: "Governor", date: E_DAY, description: "Incumbent Katie Hobbs (D) seeks re-election. GOP primary July 21: Andy Biggs, Karrin Taylor Robson, David Schweikert.", candidates: [
    { name: "Katie Hobbs", party: "D", isIncumbent: true, description: "Incumbent Governor of Arizona seeking a second term." },
    { name: "Andy Biggs", party: "R", isIncumbent: false, description: "U.S. Representative (AZ-05); July 21 GOP primary candidate." },
    { name: "Karrin Taylor Robson", party: "R", isIncumbent: false, description: "Businesswoman and 2022 candidate; July 21 GOP primary candidate." },
  ]},
  { state: "AR", title: "Arkansas Gubernatorial Election", subtitle: "Governor Race", type: "general", level: "state", office: "Governor", date: E_DAY, description: "Incumbent Sarah Huckabee Sanders (R) seeks re-election against Fredrick Love (D).", candidates: [
    { name: "Sarah Huckabee Sanders", party: "R", isIncumbent: true, description: "Incumbent Governor of Arkansas seeking a second term." },
    { name: "Fredrick Love", party: "D", isIncumbent: false, description: "State representative; Democratic nominee." },
  ]},
  { state: "CA", title: "California Gubernatorial Election", subtitle: "Open Seat (Newsom term-limited)", type: "general", level: "state", office: "Governor", date: E_DAY, description: "Open seat. June 2 top-two primary: Xavier Becerra (D) and Steve Hilton (R) advanced to November.", candidates: [
    { name: "Xavier Becerra", party: "D", isIncumbent: false, description: "Former U.S. HHS Secretary and former California Attorney General." },
    { name: "Steve Hilton", party: "R", isIncumbent: false, description: "Former Fox News host; advanced from the top-two primary." },
  ]},
  { state: "CO", title: "Colorado Gubernatorial Election", subtitle: "Open Seat (Polis term-limited)", type: "general", level: "state", office: "Governor", date: E_DAY, description: "Open seat. Primary June 30 — Democratic: Michael Bennet vs Phil Weiser.", candidates: [
    { name: "Michael Bennet", party: "D", isIncumbent: false, description: "U.S. Senator; June 30 Democratic primary candidate." },
    { name: "Phil Weiser", party: "D", isIncumbent: false, description: "Colorado Attorney General; June 30 Democratic primary candidate." },
  ]},
  { state: "CT", title: "Connecticut Gubernatorial Election", subtitle: "Governor Race", type: "general", level: "state", office: "Governor", date: E_DAY, description: "Incumbent Ned Lamont (D) seeks a third term; Ryan Fazio (R) won the GOP convention.", candidates: [
    { name: "Ned Lamont", party: "D", isIncumbent: true, description: "Incumbent Governor of Connecticut seeking a third term." },
    { name: "Ryan Fazio", party: "R", isIncumbent: false, description: "State senator; Republican convention winner." },
  ]},
  { state: "FL", title: "Florida Gubernatorial Election", subtitle: "Open Seat (DeSantis term-limited)", type: "general", level: "state", office: "Governor", date: E_DAY, description: "Open seat. Rep. Byron Donalds leads the GOP field; David Jolly leads the Democratic field. Primaries Aug 18.", candidates: [
    { name: "Byron Donalds", party: "R", isIncumbent: false, description: "U.S. Representative (FL-19); GOP primary frontrunner." },
    { name: "Jay Collins", party: "R", isIncumbent: false, description: "Lieutenant Governor of Florida; Aug 18 GOP primary candidate." },
    { name: "David Jolly", party: "D", isIncumbent: false, description: "Former U.S. Representative; Democratic primary frontrunner." },
    { name: "Jerry Demings", party: "D", isIncumbent: false, description: "Orange County Mayor; Aug 18 Democratic primary candidate." },
  ]},
  { state: "GA", title: "Georgia Gubernatorial Election", subtitle: "Open Seat (Kemp term-limited)", type: "general", level: "state", office: "Governor", date: E_DAY, description: "Open seat rated a toss-up. Keisha Lance Bottoms (D) is the nominee; GOP runoff June 16: Burt Jones vs Rick Jackson.", candidates: [
    { name: "Keisha Lance Bottoms", party: "D", isIncumbent: false, description: "Former Mayor of Atlanta; Democratic nominee." },
    { name: "Burt Jones", party: "R", isIncumbent: false, description: "Lieutenant Governor of Georgia; leads the June 16 GOP runoff." },
    { name: "Rick Jackson", party: "R", isIncumbent: false, description: "Businessman; June 16 GOP runoff candidate." },
  ]},
  { state: "HI", title: "Hawaii Gubernatorial Election", subtitle: "Governor Race", type: "general", level: "state", office: "Governor", date: E_DAY, description: "Incumbent Josh Green (D) seeks a second term.", candidates: [
    { name: "Josh Green", party: "D", isIncumbent: true, description: "Incumbent Governor of Hawaii seeking a second term." },
  ]},
  { state: "ID", title: "Idaho Gubernatorial Election", subtitle: "Governor Race", type: "general", level: "state", office: "Governor", date: E_DAY, description: "Incumbent Brad Little (R) seeks a third term against Terri Pickens (D).", candidates: [
    { name: "Brad Little", party: "R", isIncumbent: true, description: "Incumbent Governor of Idaho seeking a third term." },
    { name: "Terri Pickens", party: "D", isIncumbent: false, description: "Attorney; Democratic nominee." },
  ]},
  { state: "IL", title: "Illinois Gubernatorial Election", subtitle: "Governor Race — 2022 rematch", type: "general", level: "state", office: "Governor", date: E_DAY, description: "Incumbent JB Pritzker (D) seeks a third term in a rematch with Darren Bailey (R).", candidates: [
    { name: "JB Pritzker", party: "D", isIncumbent: true, description: "Incumbent Governor of Illinois seeking a third term." },
    { name: "Darren Bailey", party: "R", isIncumbent: false, description: "Former state senator; Republican nominee (2022 rematch)." },
  ]},
  { state: "IA", title: "Iowa Gubernatorial Election", subtitle: "Open Seat (Reynolds retiring) — toss-up", type: "general", level: "state", office: "Governor", date: E_DAY, description: "Open seat. Zach Lahn (R) upset Rep. Randy Feenstra in the primary; State Auditor Rob Sand (D) was unopposed.", candidates: [
    { name: "Zach Lahn", party: "R", isIncumbent: false, description: "Businessman and school-choice advocate; Republican nominee." },
    { name: "Rob Sand", party: "D", isIncumbent: false, description: "Iowa State Auditor; Democratic nominee." },
  ]},
  { state: "KS", title: "Kansas Gubernatorial Election", subtitle: "Open Seat (Kelly term-limited)", type: "general", level: "state", office: "Governor", date: E_DAY, description: "Open seat leaning Republican. Primaries Aug 4.", candidates: [] },
  { state: "ME", title: "Maine Gubernatorial Election", subtitle: "Open Seat (Mills term-limited)", type: "general", level: "state", office: "Governor", date: E_DAY, description: "Open seat. June 9 ranked-choice primary tabulation pending — first-round leaders Nirav Shah (D) and Bobby Charles (R). Rick Bennett running as an Independent.", candidates: [
    { name: "Rick Bennett", party: "I", isIncumbent: false, description: "State senator; Independent candidate." },
  ]},
  { state: "MD", title: "Maryland Gubernatorial Election", subtitle: "Governor Race", type: "general", level: "state", office: "Governor", date: E_DAY, description: "Incumbent Wes Moore (D) seeks a second term. Primary June 23.", candidates: [
    { name: "Wes Moore", party: "D", isIncumbent: true, description: "Incumbent Governor of Maryland seeking a second term." },
  ]},
  { state: "MA", title: "Massachusetts Gubernatorial Election", subtitle: "Governor Race", type: "general", level: "state", office: "Governor", date: E_DAY, description: "Incumbent Maura Healey (D) seeks a second term. GOP primary Sep 1.", candidates: [
    { name: "Maura Healey", party: "D", isIncumbent: true, description: "Incumbent Governor of Massachusetts seeking a second term." },
  ]},
  { state: "MI", title: "Michigan Gubernatorial Election", subtitle: "Open Seat (Whitmer term-limited) — toss-up", type: "general", level: "state", office: "Governor", date: E_DAY, description: "Open seat. Frontrunners: SoS Jocelyn Benson (D) and Rep. John James (R). Primaries Aug 4.", candidates: [
    { name: "Jocelyn Benson", party: "D", isIncumbent: false, description: "Michigan Secretary of State; Democratic frontrunner." },
    { name: "John James", party: "R", isIncumbent: false, description: "U.S. Representative (MI-10); Republican frontrunner." },
  ]},
  { state: "MN", title: "Minnesota Gubernatorial Election", subtitle: "Open Seat (Walz retiring)", type: "general", level: "state", office: "Governor", date: E_DAY, description: "Open seat — Tim Walz ended his re-election bid. Sen. Amy Klobuchar won the DFL endorsement.", candidates: [
    { name: "Amy Klobuchar", party: "D", isIncumbent: false, description: "U.S. Senator; won the DFL endorsement for governor." },
  ]},
  { state: "NE", title: "Nebraska Gubernatorial Election", subtitle: "Governor Race", type: "general", level: "state", office: "Governor", date: E_DAY, description: "Incumbent Jim Pillen (R) seeks a second term against Lynne Walz (D).", candidates: [
    { name: "Jim Pillen", party: "R", isIncumbent: true, description: "Incumbent Governor of Nebraska seeking a second term." },
    { name: "Lynne Walz", party: "D", isIncumbent: false, description: "Former state senator; Democratic nominee." },
  ]},
  { state: "NV", title: "Nevada Gubernatorial Election", subtitle: "Governor Race — toss-up", type: "general", level: "state", office: "Governor", date: E_DAY, description: "Incumbent Joe Lombardo (R) seeks a second term against AG Aaron Ford (D).", candidates: [
    { name: "Joe Lombardo", party: "R", isIncumbent: true, description: "Incumbent Governor of Nevada seeking a second term." },
    { name: "Aaron Ford", party: "D", isIncumbent: false, description: "Nevada Attorney General; Democratic nominee." },
  ]},
  { state: "NH", title: "New Hampshire Gubernatorial Election", subtitle: "Governor Race (two-year term)", type: "general", level: "state", office: "Governor", date: E_DAY, description: "Incumbent Kelly Ayotte (R) seeks a second term. Cinde Warmington leads the Democratic field.", candidates: [
    { name: "Kelly Ayotte", party: "R", isIncumbent: true, description: "Incumbent Governor of New Hampshire seeking a second term." },
    { name: "Cinde Warmington", party: "D", isIncumbent: false, description: "Executive councilor; leading Democratic candidate." },
  ]},
  { state: "NM", title: "New Mexico Gubernatorial Election", subtitle: "Open Seat (Lujan Grisham term-limited)", type: "general", level: "state", office: "Governor", date: E_DAY, description: "Open seat. Former Interior Secretary Deb Haaland (D) vs Rio Rancho Mayor Gregg Hull (R).", candidates: [
    { name: "Deb Haaland", party: "D", isIncumbent: false, description: "Former U.S. Interior Secretary; Democratic nominee." },
    { name: "Gregg Hull", party: "R", isIncumbent: false, description: "Mayor of Rio Rancho; Republican nominee." },
    { name: "Ken Miyagishima", party: "I", isIncumbent: false, description: "Former Las Cruces mayor; Independent candidate." },
  ]},
  { state: "NY", title: "New York Gubernatorial Election", subtitle: "Governor Race", type: "general", level: "state", office: "Governor", date: E_DAY, description: "Incumbent Kathy Hochul (D) seeks a second full term. Bruce Blakeman (R) is the GOP frontrunner after Elise Stefanik withdrew.", candidates: [
    { name: "Kathy Hochul", party: "D", isIncumbent: true, description: "Incumbent Governor of New York seeking a second full term." },
    { name: "Bruce Blakeman", party: "R", isIncumbent: false, description: "Nassau County Executive; Republican frontrunner." },
  ]},
  { state: "OH", title: "Ohio Gubernatorial Election", subtitle: "Open Seat (DeWine term-limited)", type: "general", level: "state", office: "Governor", date: E_DAY, description: "Open seat. Vivek Ramaswamy (R) vs Dr. Amy Acton (D).", candidates: [
    { name: "Vivek Ramaswamy", party: "R", isIncumbent: false, description: "Entrepreneur and 2024 presidential candidate; Republican nominee." },
    { name: "Amy Acton", party: "D", isIncumbent: false, description: "Former Ohio Department of Health director; Democratic nominee." },
  ]},
  { state: "OK", title: "Oklahoma Gubernatorial Election", subtitle: "Open Seat (Stitt term-limited)", type: "general", level: "state", office: "Governor", date: E_DAY, description: "Open seat. AG Gentner Drummond leads the GOP field; Cyndi Munson leads the Democratic field. Primary June 16.", candidates: [
    { name: "Gentner Drummond", party: "R", isIncumbent: false, description: "Oklahoma Attorney General; GOP primary frontrunner." },
    { name: "Cyndi Munson", party: "D", isIncumbent: false, description: "State House minority leader; leading Democratic candidate." },
  ]},
  { state: "OR", title: "Oregon Gubernatorial Election", subtitle: "Governor Race — 2022 rematch", type: "general", level: "state", office: "Governor", date: E_DAY, description: "Incumbent Tina Kotek (D) seeks a second term in a rematch with Christine Drazan (R).", candidates: [
    { name: "Tina Kotek", party: "D", isIncumbent: true, description: "Incumbent Governor of Oregon seeking a second term." },
    { name: "Christine Drazan", party: "R", isIncumbent: false, description: "Former state House minority leader; Republican nominee (2022 rematch)." },
  ]},
  { state: "PA", title: "Pennsylvania Gubernatorial Election", subtitle: "Governor Race", type: "general", level: "state", office: "Governor", date: E_DAY, description: "Incumbent Josh Shapiro (D) seeks a second term against Treasurer Stacy Garrity (R).", candidates: [
    { name: "Josh Shapiro", party: "D", isIncumbent: true, description: "Incumbent Governor of Pennsylvania seeking a second term." },
    { name: "Stacy Garrity", party: "R", isIncumbent: false, description: "Pennsylvania State Treasurer; Republican nominee." },
  ]},
  { state: "RI", title: "Rhode Island Gubernatorial Election", subtitle: "Governor Race", type: "general", level: "state", office: "Governor", date: E_DAY, description: "Incumbent Daniel McKee (D) faces a contested primary (vs Helena Foulkes) September 8.", candidates: [
    { name: "Daniel McKee", party: "D", isIncumbent: true, description: "Incumbent Governor of Rhode Island seeking re-election." },
  ]},
  { state: "SC", title: "South Carolina Gubernatorial Election", subtitle: "Open Seat (McMaster term-limited)", type: "general", level: "state", office: "Governor", date: E_DAY, description: "Open seat. Jermaine Johnson (D) is the nominee; GOP runoff June 23: Pamela Evette vs Alan Wilson.", candidates: [
    { name: "Jermaine Johnson", party: "D", isIncumbent: false, description: "State representative; Democratic nominee." },
    { name: "Pamela Evette", party: "R", isIncumbent: false, description: "Lieutenant Governor of South Carolina; June 23 GOP runoff candidate." },
    { name: "Alan Wilson", party: "R", isIncumbent: false, description: "South Carolina Attorney General; June 23 GOP runoff candidate." },
  ]},
  { state: "SD", title: "South Dakota Gubernatorial Election", subtitle: "Governor Race", type: "general", level: "state", office: "Governor", date: E_DAY, description: "Gov. Larry Rhoden (ascended when Noem left) faces a July 28 GOP runoff against Toby Doeden.", candidates: [
    { name: "Larry Rhoden", party: "R", isIncumbent: true, description: "Incumbent Governor of South Dakota; July 28 GOP runoff candidate." },
    { name: "Toby Doeden", party: "R", isIncumbent: false, description: "Businessman; July 28 GOP runoff candidate." },
  ]},
  { state: "TN", title: "Tennessee Gubernatorial Election", subtitle: "Open Seat (Lee term-limited)", type: "general", level: "state", office: "Governor", date: E_DAY, description: "Open seat. Sen. Marsha Blackburn leads the GOP field. Primary Aug 6.", candidates: [
    { name: "Marsha Blackburn", party: "R", isIncumbent: false, description: "U.S. Senator; GOP primary frontrunner." },
    { name: "Jerri Green", party: "D", isIncumbent: false, description: "Memphis attorney; Democratic candidate." },
  ]},
  { state: "TX", title: "Texas Gubernatorial Election", subtitle: "Governor Race", type: "general", level: "state", office: "Governor", date: E_DAY, description: "Incumbent Greg Abbott (R) seeks a fourth term against Gina Hinojosa (D).", candidates: [
    { name: "Greg Abbott", party: "R", isIncumbent: true, description: "Incumbent Governor of Texas seeking a fourth term." },
    { name: "Gina Hinojosa", party: "D", isIncumbent: false, description: "Texas state representative from Austin; Democratic nominee." },
  ]},
  { state: "VT", title: "Vermont Gubernatorial Election", subtitle: "Governor Race (two-year term)", type: "general", level: "state", office: "Governor", date: E_DAY, description: "Incumbent Phil Scott (R) running for a sixth two-year term.", candidates: [
    { name: "Phil Scott", party: "R", isIncumbent: true, description: "Incumbent Governor of Vermont seeking a sixth term." },
  ]},
  { state: "WI", title: "Wisconsin Gubernatorial Election", subtitle: "Open Seat (Evers retiring) — toss-up", type: "general", level: "state", office: "Governor", date: E_DAY, description: "Open seat. Democratic field includes Mandela Barnes, David Crowley, Sara Rodriguez; Rep. Tom Tiffany leads the GOP field. Primaries Aug 11.", candidates: [
    { name: "Tom Tiffany", party: "R", isIncumbent: false, description: "U.S. Representative (WI-07); Republican frontrunner." },
    { name: "Mandela Barnes", party: "D", isIncumbent: false, description: "Former lieutenant governor; Aug 11 Democratic primary candidate." },
  ]},
  { state: "WY", title: "Wyoming Gubernatorial Election", subtitle: "Open Seat (Gordon term-limited)", type: "general", level: "state", office: "Governor", date: E_DAY, description: "Open seat. The Aug 18 GOP primary effectively decides the race.", candidates: [] },
];

// ── Upcoming statewide primaries (after 2026-06-11) ──
export const UPCOMING_PRIMARIES: SeedRace[] = [
  { state: "OK", title: "Oklahoma Primary Election", subtitle: "Statewide Primary", type: "primary", level: "state", office: "All Offices", date: "2026-06-16", description: "Oklahoma statewide primary (runoff Aug 25 if needed).", candidates: [] },
  { state: "MD", title: "Maryland Primary Election", subtitle: "Statewide Primary", type: "primary", level: "state", office: "All Offices", date: "2026-06-23", description: "Maryland closed primary.", candidates: [] },
  { state: "NY", title: "New York Primary Election", subtitle: "Statewide Primary", type: "primary", level: "state", office: "All Offices", date: "2026-06-23", description: "New York closed primary.", candidates: [] },
  { state: "UT", title: "Utah Primary Election", subtitle: "Statewide Primary", type: "primary", level: "state", office: "All Offices", date: "2026-06-23", description: "Utah closed primary.", candidates: [] },
  { state: "CO", title: "Colorado Primary Election", subtitle: "Statewide Primary", type: "primary", level: "state", office: "All Offices", date: "2026-06-30", description: "Colorado semi-open primary.", candidates: [] },
  { state: "AZ", title: "Arizona Primary Election", subtitle: "Statewide Primary", type: "primary", level: "state", office: "All Offices", date: "2026-07-21", description: "Arizona statewide primary.", candidates: [] },
  { state: "KS", title: "Kansas Primary Election", subtitle: "Statewide Primary", type: "primary", level: "state", office: "All Offices", date: "2026-08-04", description: "Kansas closed primary.", candidates: [] },
  { state: "MI", title: "Michigan Primary Election", subtitle: "Statewide Primary", type: "primary", level: "state", office: "All Offices", date: "2026-08-04", description: "Michigan open primary.", candidates: [] },
  { state: "MO", title: "Missouri Primary Election", subtitle: "Statewide Primary", type: "primary", level: "state", office: "All Offices", date: "2026-08-04", description: "Missouri open primary.", candidates: [] },
  { state: "VA", title: "Virginia Primary Election", subtitle: "Statewide Primary", type: "primary", level: "state", office: "All Offices", date: "2026-08-04", description: "Virginia open primary.", candidates: [] },
  { state: "WA", title: "Washington Primary Election", subtitle: "Top-Two Primary", type: "primary", level: "state", office: "All Offices", date: "2026-08-04", description: "Washington top-two nonpartisan primary.", candidates: [] },
  { state: "TN", title: "Tennessee Primary Election", subtitle: "Statewide Primary", type: "primary", level: "state", office: "All Offices", date: "2026-08-06", description: "Tennessee open primary.", candidates: [] },
  { state: "HI", title: "Hawaii Primary Election", subtitle: "Statewide Primary", type: "primary", level: "state", office: "All Offices", date: "2026-08-08", description: "Hawaii open primary.", candidates: [] },
  { state: "CT", title: "Connecticut Primary Election", subtitle: "Statewide Primary", type: "primary", level: "state", office: "All Offices", date: "2026-08-11", description: "Connecticut closed primary.", candidates: [] },
  { state: "MN", title: "Minnesota Primary Election", subtitle: "Statewide Primary", type: "primary", level: "state", office: "All Offices", date: "2026-08-11", description: "Minnesota open primary.", candidates: [] },
  { state: "VT", title: "Vermont Primary Election", subtitle: "Statewide Primary", type: "primary", level: "state", office: "All Offices", date: "2026-08-11", description: "Vermont open primary.", candidates: [] },
  { state: "WI", title: "Wisconsin Primary Election", subtitle: "Statewide Primary", type: "primary", level: "state", office: "All Offices", date: "2026-08-11", description: "Wisconsin open primary.", candidates: [] },
  { state: "AK", title: "Alaska Primary Election", subtitle: "Top-Four Primary", type: "primary", level: "state", office: "All Offices", date: "2026-08-18", description: "Alaska top-four nonpartisan primary; ranked-choice general.", candidates: [] },
  { state: "FL", title: "Florida Primary Election", subtitle: "Statewide Primary", type: "primary", level: "state", office: "All Offices", date: "2026-08-18", description: "Florida closed primary.", candidates: [] },
  { state: "WY", title: "Wyoming Primary Election", subtitle: "Statewide Primary", type: "primary", level: "state", office: "All Offices", date: "2026-08-18", description: "Wyoming open primary.", candidates: [] },
  { state: "MA", title: "Massachusetts Primary Election", subtitle: "Statewide Primary", type: "primary", level: "state", office: "All Offices", date: "2026-09-01", description: "Massachusetts semi-open primary.", candidates: [] },
  { state: "NH", title: "New Hampshire Primary Election", subtitle: "Statewide Primary", type: "primary", level: "state", office: "All Offices", date: "2026-09-08", description: "New Hampshire semi-closed primary.", candidates: [] },
  { state: "RI", title: "Rhode Island Primary Election", subtitle: "Statewide Primary", type: "primary", level: "state", office: "All Offices", date: "2026-09-08", description: "Rhode Island semi-closed primary.", candidates: [] },
  { state: "DE", title: "Delaware Primary Election", subtitle: "Statewide Primary", type: "primary", level: "state", office: "All Offices", date: "2026-09-15", description: "Delaware closed primary.", candidates: [] },
];

// ── Upcoming runoffs (after 2026-06-11) ──
export const UPCOMING_RUNOFFS: SeedRace[] = [
  { state: "AL", title: "Alabama Primary Runoff", subtitle: "Senate runoffs (both parties)", type: "runoff", level: "state", office: "U.S. Senate", date: "2026-06-16", description: "GOP: Barry Moore vs Jared Hudson. Dem: Dakarai Larriett vs Everett Wess.", candidates: [
    { name: "Barry Moore", party: "R", isIncumbent: false, description: "U.S. Representative (AL-01); GOP Senate runoff candidate (Trump-endorsed)." },
    { name: "Jared Hudson", party: "R", isIncumbent: false, description: "Former Navy SEAL; GOP Senate runoff candidate." },
    { name: "Dakarai Larriett", party: "D", isIncumbent: false, description: "Businessman; Democratic Senate runoff candidate." },
    { name: "Everett Wess", party: "D", isIncumbent: false, description: "Pastor; Democratic Senate runoff candidate." },
  ]},
  { state: "GA", title: "Georgia Primary Runoff", subtitle: "GOP Senate and Governor runoffs", type: "runoff", level: "state", office: "U.S. Senate / Governor", date: "2026-06-16", description: "Senate GOP: Mike Collins vs Derek Dooley. Governor GOP: Burt Jones vs Rick Jackson.", candidates: [
    { name: "Mike Collins", party: "R", isIncumbent: false, description: "U.S. Representative (GA-10); GOP Senate runoff candidate." },
    { name: "Derek Dooley", party: "R", isIncumbent: false, description: "Former Tennessee football head coach; GOP Senate runoff candidate." },
    { name: "Burt Jones", party: "R", isIncumbent: false, description: "Lieutenant Governor of Georgia; GOP Governor runoff candidate." },
    { name: "Rick Jackson", party: "R", isIncumbent: false, description: "Businessman; GOP Governor runoff candidate." },
  ]},
  { state: "SC", title: "South Carolina Primary Runoff", subtitle: "GOP Governor runoff", type: "runoff", level: "state", office: "Governor", date: "2026-06-23", description: "GOP: Pamela Evette vs Alan Wilson.", candidates: [
    { name: "Pamela Evette", party: "R", isIncumbent: false, description: "Lieutenant Governor of South Carolina; GOP Governor runoff candidate." },
    { name: "Alan Wilson", party: "R", isIncumbent: false, description: "South Carolina Attorney General; GOP Governor runoff candidate." },
  ]},
  { state: "LA", title: "Louisiana Primary Runoff", subtitle: "Senate runoffs (both parties)", type: "runoff", level: "state", office: "U.S. Senate", date: "2026-06-27", description: "GOP: Julia Letlow vs John Fleming. Dem: Gary Crockett vs Jamie Davis.", candidates: [
    { name: "Julia Letlow", party: "R", isIncumbent: false, description: "U.S. Representative (LA-05); GOP Senate runoff candidate." },
    { name: "John Fleming", party: "R", isIncumbent: false, description: "Louisiana State Treasurer and former U.S. Representative; GOP Senate runoff candidate." },
    { name: "Gary Crockett", party: "D", isIncumbent: false, description: "Democratic Senate runoff candidate." },
    { name: "Jamie Davis", party: "D", isIncumbent: false, description: "Democratic Senate runoff candidate." },
  ]},
  { state: "SD", title: "South Dakota Primary Runoff", subtitle: "GOP Governor runoff", type: "runoff", level: "state", office: "Governor", date: "2026-07-28", description: "GOP: Larry Rhoden vs Toby Doeden.", candidates: [
    { name: "Larry Rhoden", party: "R", isIncumbent: true, description: "Incumbent Governor of South Dakota; GOP runoff candidate." },
    { name: "Toby Doeden", party: "R", isIncumbent: false, description: "Businessman; GOP runoff candidate." },
  ]},
];

// ── 2026 House special elections (upcoming as of June 11) ──
export const HOUSE_SPECIALS: SeedRace[] = [
  { state: "CA", title: "U.S. House Special Election - CA-14", subtitle: "Swalwell vacancy", type: "special", level: "federal", office: "U.S. House of Representatives", date: "2026-06-16", description: "Special election for California's 14th district (Rep. Eric Swalwell resigned April 2026).", candidates: [] },
  { state: "GA", title: "U.S. House Special Election - GA-13", subtitle: "Scott vacancy", type: "special", level: "federal", office: "U.S. House of Representatives", date: "2026-07-28", description: "Special election for Georgia's 13th district (Rep. David Scott died April 2026).", candidates: [] },
];
