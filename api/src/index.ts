import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { auth } from './auth.js';
import { recipesRouter } from './routes/recipes.js';
import { shoppingRouter } from './routes/shopping.js';
import { tasksRouter } from './routes/tasks.js';
import { familiesRouter } from './routes/families.js';
import { db } from './db/index.js';
import { sql } from 'drizzle-orm';

// Define custom context variables
type Variables = {
	user: {
		id: string;
		email: string;
		name: string;
	};
	familyId: string;
};

const app = new Hono<{ Variables: Variables }>();

// Middleware
app.use('*', logger());
app.use('/*', cors({
	origin: ['http://localhost:5173', 'http://localhost:3000'],
	credentials: true,
}));

// Health check
app.get('/', (c) => {
	return c.json({ status: 'ok', name: 'ClairOS API', version: '0.1.0' });
});

app.get('/api/health', async (c) => {
	try {
		// Check DB connection
		await db.execute(sql`SELECT 1`);
		return c.json({
			status: 'healthy',
			database: 'connected',
			timestamp: new Date().toISOString()
		});
	} catch (error) {
		console.error('Health check failed:', error);
		return c.json({
			status: 'unhealthy',
			database: 'disconnected',
			error: error instanceof Error ? error.message : String(error),
			timestamp: new Date().toISOString()
		}, 503);
	}
});

// BetterAuth routes - handles all /api/auth/* paths
app.on(['GET', 'POST'], '/api/auth/*', (c) => {
	return auth.handler(c.req.raw);
});

// API routes
app.route('/api/families', familiesRouter);
app.route('/api/recipes', recipesRouter);
app.route('/api/shopping', shoppingRouter);
app.route('/api/tasks', tasksRouter);
import { storageRouter } from './routes/storage.js';
app.route('/api/storage', storageRouter);

// Start server
const port = parseInt(process.env.PORT || '3001', 10);

console.log(`🚀 ClairOS API running on http://localhost:${port}`);

serve({
	fetch: app.fetch,
	port,
});

export default app;
export type { Variables };
