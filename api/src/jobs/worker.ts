import { configureSidequest, startJobProcessor } from './index.ts';

console.log('👷 Background worker starting...');

// Start the job processor
configureSidequest().then(() => startJobProcessor())

// Handle graceful shutdown
process.on('SIGTERM', async () => {
	console.log('SIGTERM signal received: closing Sidequest');
	const { stopJobProcessor } = await import('./index.ts');
	await stopJobProcessor();
	process.exit(0);
});

process.on('SIGINT', async () => {
	console.log('SIGINT signal received: closing Sidequest');
	const { stopJobProcessor } = await import('./index.ts');
	await stopJobProcessor();
	process.exit(0);
});
