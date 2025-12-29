import { defineConfig } from 'drizzle-kit';

export default defineConfig({
	schema: './src/db/schema.ts',
	out: './src/db/migrations',
	dialect: 'postgresql',
	dbCredentials: {
		url: process.env.DATABASE_URL || 'postgres://clairos:clairos_dev@localhost:5432/clairos',
	},
	verbose: true,
	strict: true,
});
