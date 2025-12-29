import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';

const connectionString = process.env.DATABASE_URL || 'postgres://clairos:clairos_dev@localhost:5432/clairos';

// For query purposes
const queryClient = postgres(connectionString);
export const db = drizzle(queryClient, { schema });

// For migrations (uses a single connection)
export const migrationClient = postgres(connectionString, { max: 1 });
