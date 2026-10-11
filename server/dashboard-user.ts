import type { User } from "@shared/schema";
import { dashboardUserSchema } from "@shared/schema";

/**
 * Map a `users` row to the dashboard user payload.
 *
 * Accounts created through /api/auth/register have NULL first/last name and
 * email_verified=false; the response schema treats names as optional, so
 * nulls are normalised to `undefined` (ZodError "expected string, received
 * null" otherwise). Validated here so the route cannot drift from the schema.
 */
export function buildDashboardUser(user: User, now: Date = new Date()) {
  const joined = user.createdAt ? new Date(user.createdAt) : now;
  const daysSinceJoining = Math.max(0, Math.floor((now.getTime() - joined.getTime()) / 86_400_000));
  return dashboardUserSchema.parse({
    id: user.id,
    email: user.email ?? "",
    firstName: user.firstName ?? undefined,
    lastName: user.lastName ?? undefined,
    emailVerified: Boolean(user.emailVerified),
    joinedAt: joined.toISOString(),
    daysSinceJoining,
  });
}
