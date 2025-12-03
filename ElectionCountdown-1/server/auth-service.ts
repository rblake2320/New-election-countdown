import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from './db';
import { users, sessions, type User, type UpsertUser } from '@shared/schema';
import { eq } from 'drizzle-orm';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface AuthResponse {
  user: Omit<User, 'passwordHash'>;
  token: string;
}

export class AuthService {
  async signup(email: string, password: string): Promise<AuthResponse> {
    // Check if user already exists
    const existingUser = await this.getUserByEmail(email);
    if (existingUser) {
      throw new Error('User already exists with this email');
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user
    const [newUser] = await db
      .insert(users)
      .values({
        email,
        passwordHash,
      })
      .returning();

    // Create session
    const token = await this.createSession(newUser.id);

    return {
      user: this.sanitizeUser(newUser),
      token,
    };
  }

  async signin(email: string, password: string): Promise<AuthResponse> {
    // Find user
    const user = await this.getUserByEmail(email);
    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new Error('Invalid credentials');
    }

    // Update last login
    await db
      .update(users)
      .set({ lastLogin: new Date() })
      .where(eq(users.id, user.id));

    // Create session
    const token = await this.createSession(user.id);

    return {
      user: this.sanitizeUser(user),
      token,
    };
  }

  async validateSession(token: string): Promise<User | null> {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number; sessionId: string };
      
      // Check if session exists and is valid
      const [session] = await db
        .select()
        .from(userSessions)
        .where(eq(userSessions.sessionToken, token));

      if (!session || session.expiresAt < new Date()) {
        return null;
      }

      // Get user
      const user = await this.getUserById(decoded.userId);
      return user;
    } catch (error) {
      return null;
    }
  }

  async signout(token: string): Promise<void> {
    try {
      // Remove session from database
      await db
        .delete(userSessions)
        .where(eq(userSessions.sessionToken, token));
    } catch (error) {
      console.error('Error during signout:', error);
    }
  }

  private async createSession(userId: number): Promise<string> {
    const sessionToken = jwt.sign(
      { userId, sessionId: `session_${Date.now()}` },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const expiresAt = new Date(Date.now() + SESSION_DURATION);

    await db
      .insert(userSessions)
      .values({
        userId,
        sessionToken,
        expiresAt,
      });

    return sessionToken;
  }

  private async getUserByEmail(email: string): Promise<User | null> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email));
    
    return user || null;
  }

  private async getUserById(id: number): Promise<User | null> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, id));
    
    return user || null;
  }

  private sanitizeUser(user: User): Omit<User, 'passwordHash'> {
    const { passwordHash, ...sanitizedUser } = user;
    return sanitizedUser;
  }
}

export const authService = new AuthService();