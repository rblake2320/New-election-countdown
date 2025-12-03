import { pgTable, text, serial, integer, boolean, timestamp, jsonb, varchar, numeric, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const elections = pgTable("elections", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  subtitle: text("subtitle"),
  location: text("location").notNull(),
  state: text("state").notNull(),
  date: timestamp("date").notNull(),
  type: text("type").notNull(), // 'primary', 'general', 'special'
  level: text("level").notNull(), // 'federal', 'state', 'local'
  offices: text("offices").array(),
  description: text("description"),
  pollsOpen: text("polls_open"),
  pollsClose: text("polls_close"),
  timezone: text("timezone"),
  isActive: boolean("is_active").default(true),
});

export const candidates = pgTable("candidates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  party: text("party").notNull(), // 'D', 'R', 'I', 'G', etc.
  electionId: integer("election_id").references(() => elections.id),
  pollingSupport: integer("polling_support"), // percentage
  isIncumbent: boolean("is_incumbent").default(false),
  description: text("description"),
  website: text("website"),
});

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table for Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Watchlist for authenticated users
export const watchlist = pgTable("watchlist", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  electionId: integer("election_id").references(() => elections.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Congressional data tables
export const congressMembers = pgTable("congress_members", {
  id: serial("id").primaryKey(),
  bioguideId: varchar("bioguide_id", { length: 20 }).notNull().unique(),
  name: text("name").notNull(),
  party: varchar("party", { length: 50 }),
  state: varchar("state", { length: 2 }),
  chamber: varchar("chamber", { length: 10 }), // 'House' or 'Senate'
  district: varchar("district", { length: 10 }),
  congress: integer("congress"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Filter schema
export const filterSchema = z.object({
  timeRange: z.enum(['week', 'month', 'quarter', 'year', 'all']).optional(),
  electionType: z.array(z.string()).optional(),
  level: z.array(z.string()).optional(),
  state: z.string().optional(),
  search: z.string().optional(),
});

// Relations
export const electionsRelations = relations(elections, ({ many }) => ({
  candidates: many(candidates),
  watchlistItems: many(watchlist),
}));

export const candidatesRelations = relations(candidates, ({ one }) => ({
  election: one(elections, {
    fields: [candidates.electionId],
    references: [elections.id],
  }),
}));

export const usersRelations = relations(users, ({ many }) => ({
  watchlistItems: many(watchlist),
}));

export const watchlistRelations = relations(watchlist, ({ one }) => ({
  user: one(users, {
    fields: [watchlist.userId],
    references: [users.id],
  }),
  election: one(elections, {
    fields: [watchlist.electionId],
    references: [elections.id],
  }),
}));

// Insert schemas
export const insertElectionSchema = createInsertSchema(elections).omit({
  id: true,
});

export const insertCandidateSchema = createInsertSchema(candidates).omit({
  id: true,
});

export const insertWatchlistSchema = createInsertSchema(watchlist).omit({
  id: true,
  createdAt: true,
});

export const insertCongressMemberSchema = createInsertSchema(congressMembers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type Election = typeof elections.$inferSelect;
export type InsertElection = z.infer<typeof insertElectionSchema>;
export type Candidate = typeof candidates.$inferSelect;
export type InsertCandidate = z.infer<typeof insertCandidateSchema>;
export type ElectionFilters = z.infer<typeof filterSchema>;
export type User = typeof users.$inferSelect;
export type UpsertUser = typeof users.$inferInsert;
export type WatchlistItem = typeof watchlist.$inferSelect;
export type InsertWatchlistItem = z.infer<typeof insertWatchlistSchema>;
export type CongressMember = typeof congressMembers.$inferSelect;
export type InsertCongressMember = z.infer<typeof insertCongressMemberSchema>;