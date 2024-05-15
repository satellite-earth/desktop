import { app } from 'electron';
import Desktop from './app/index.js';
import { logger } from './logger.js';

import crypto from 'crypto';

app
	.whenReady()
	.then(() => {
		logger('Creating app');
		const desktop = new Desktop();

		app.on('quit', () => {
			logger('called quit handler');
			desktop.shutdown();
			app.exit(0);
		});

		app.on('window-all-closed', () => {
			if (process.platform !== 'darwin') {
				app.quit();
			}
		});
	})
	.catch((err) => {
		logger('Failed to create app');
		logger(err);
		app.exit(1);
	});
