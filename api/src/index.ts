import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { sql } from 'drizzle-orm';
import { auth } from './auth.ts';
import { db } from './db/index.ts';
import { recipesRouter } from './routes/recipes.ts';
import { shoppingRouter } from './routes/shopping.ts';
import { tasksRouter } from './routes/tasks.ts';
import { familiesRouter } from './routes/families.ts';
import { pushRouter } from './routes/push.ts';
import { storageRouter } from './routes/storage.ts';
import { remindersRouter } from './routes/reminders.ts';
import { billsRouter } from './routes/bills.ts';
import { configureSidequest } from './jobs/index.ts';

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
app.route('/api/storage', storageRouter);
app.route('/api/push', pushRouter);
app.route('/api/reminders', remindersRouter);
app.route('/api/bills', billsRouter);

const port = parseInt(process.env.PORT || '3001', 10);

configureSidequest();

serve({
	fetch: app.fetch,
	port,
}, (info) => {
	console.log(`🚀 ClairOS API running on http://localhost:${info.port}`);
});

export type { Variables };
