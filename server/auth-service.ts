import { db } from './db';
import { users, authSessions, type User } from '@shared/schema';
import { eq, and, gt } from 'drizzle-orm';
import { hashPassword, verifyPassword, signSession, verifySession } from './auth';
import crypto from 'crypto';

const SESSION_TTL_HOURS = parseInt(process.env.SESSION_TTL_HOURS || '720', 10); // 30 days

export interface AuthResponse {
  user: Omit<User, 'passwordHash'>;
  token: string;
}

/**
 * User account service. Password hashing uses argon2 via ./auth helpers —
 * the same primitives the /api/auth/login route verifies with. Sessions are
 * JWT (uid + jti) backed by the auth_sessions table for revocation.
 */
export class AuthService {
  async signup(email: string, password: string): Promise<AuthResponse> {
    const existingUser = await this.getUserByEmail(email);
    if (existingUser) {
      throw new Error('User already exists with this email');
    }

    const passwordHash = await hashPassword(password);

    const [newUser] = await db
      .insert(users)
      .values({ email, passwordHash })
      .returning();

    const token = await this.createSession(newUser.id);

    return { user: this.sanitizeUser(newUser), token };
  }

  async signin(email: string, password: string): Promise<AuthResponse> {
    const user = await this.getUserByEmail(email);
    if (!user || !user.passwordHash) {
      throw new Error('Invalid credentials');
    }

    const isPasswordValid = await verifyPassword(user.passwordHash, password);
    if (!isPasswordValid) {
      throw new Error('Invalid credentials');
    }

    await db.update(users).set({ lastLogin: new Date() }).where(eq(users.id, user.id));

    const token = await this.createSession(user.id);

    return { user: this.sanitizeUser(user), token };
  }

  async validateSession(token: string): Promise<User | null> {
    try {
      const { uid, jti } = verifySession(token);

      const [session] = await db
        .select()
        .from(authSessions)
        .where(
          and(
            eq(authSessions.userId, uid),
            eq(authSessions.jti, jti),
            eq(authSessions.revoked, false),
            gt(authSessions.expiresAt, new Date()),
          ),
        );
      if (!session) return null;

      return await this.getUserById(uid);
    } catch {
      return null;
    }
  }

  async signout(token: string): Promise<void> {
    try {
      const { uid, jti } = verifySession(token);
      await db
        .update(authSessions)
        .set({ revoked: true })
        .where(and(eq(authSessions.userId, uid), eq(authSessions.jti, jti)));
    } catch (error) {
      console.error('Error during signout:', error);
    }
  }

  private async createSession(userId: string): Promise<string> {
    const jti = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + SESSION_TTL_HOURS * 3600 * 1000);

    await db.insert(authSessions).values({ userId, jti, expiresAt });

    return signSession({ uid: userId, jti });
  }

  private async getUserByEmail(email: string): Promise<User | null> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || null;
  }

  private async getUserById(id: string): Promise<User | null> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || null;
  }

  private sanitizeUser(user: User): Omit<User, 'passwordHash'> {
    const { passwordHash, ...sanitizedUser } = user;
    return sanitizedUser;
  }
}

export const authService = new AuthService();
