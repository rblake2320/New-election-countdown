import { pgTable, varchar, integer, boolean, timestamp, index, primaryKey } from "drizzle-orm/pg-core";

export const elections = pgTable("elections", {
  id: varchar("id", { length: 36 }).primaryKey(),
  title: varchar("title", { length: 256 }).notNull(),
  date: timestamp("date", { withTimezone: true }).notNull(),
  state: varchar("state", { length: 2 }),
  level: varchar("level", { length: 16 }),    // federal|state|local
  type: varchar("type", { length: 16 })       // general|primary|runoff|special
}, (t) => ({
  byDate: index("elections_by_date").on(t.date),
  byState: index("elections_by_state").on(t.state),
}));

export const candidates = pgTable("candidates", {
  id: varchar("id", { length: 36 }).primaryKey(),
  name: varchar("name", { length: 160 }).notNull(),
  party: varchar("party", { length: 32 }),
  state: varchar("state", { length: 2 }),
  office: varchar("office", { length: 64 }),
  incumbent: boolean("incumbent").default(false),
  fecId: varchar("fec_id", { length: 32 }),
  photoUrl: varchar("photo_url", { length: 512 }),
  searchText: varchar("search_text", { length: 1024 }), // for FTS
}, (t) => ({
  byState: index("candidates_by_state").on(t.state),
  byParty: index("candidates_by_party").on(t.party)
}));

export const candidateElections = pgTable("candidate_elections", {
  electionId: varchar("election_id", { length: 36 }).notNull(),
  candidateId: varchar("candidate_id", { length: 36 }).notNull(),
  status: varchar("status", { length: 16 }).default("qualified"), // qualified|withdrawn
  ballotPosition: integer("ballot_position"),
}, (t) => ({
  pk: primaryKey({ columns: [t.electionId, t.candidateId] }),
  byElection: index("cand_elec_by_election").on(t.electionId),
  byCandidate: index("cand_elec_by_candidate").on(t.candidateId),
}));