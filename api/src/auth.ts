import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from './db/index.ts';
import * as schema from './db/schema.ts';
import { Config } from './config.ts';

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user: schema.users,
      session: schema.sessions,
      account: schema.accounts,
      verification: schema.verifications,
    },
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5 minutes
    },
  },
  trustedOrigins: [
    'http://localhost:5173',
    'http://localhost:3000',
  ],
  // Social providers
  socialProviders: {
    google: {
      clientId: Config.GOOGLE_OAUTH_CLIENT_ID,
      clientSecret: Config.GOOGLE_OAUTH_CLIENT_SECRET,
      redirectURI: Config.BETTER_AUTH_URL + '/api/auth/callback/google',
    },
    // github: {
    //   clientId: process.env.GITHUB_CLIENT_ID!,
    //   clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    // },
  },
});

export type Auth = typeof auth;
