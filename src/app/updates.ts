import { AppImageUpdater, AppUpdater, MacUpdater } from 'electron-updater';
import { app } from 'electron';

import { logger } from '../logger.js';

export default class UpdateManager {
	log = logger.extend('Updates');
	updater?: AppUpdater;
	lastChecked = 0;
	interval?: NodeJS.Timeout;

	updateAvailable = false;

	constructor() {
		const options = {
			provider: 's3',
			region: 'auto',
			bucket: '',
			path: '',
			endpoint: 'https://release.satellite.earth',
		} as const;

		if (process.platform === 'darwin') {
			this.updater = new MacUpdater(options);
		} else if (process.platform === 'win32') {
			// TODO windows updater
		} else {
			this.updater = new AppImageUpdater(options);
		}

		if (!this.updater) {
			this.log('failed to create autoUpdater for ' + process.platform);
		}

		// Every 30 seconds, check to see if the last time satellite checked
		// for an update was more than 3 hours ago. If it was, check again.
		// The reason for this double interval is so the app will effectively
		// check on resume (some users might never actually restart Satellite
		// and might not have their device on for 3 hours at a time very often)
		this.interval = setInterval(this.updateInterval.bind(this), 1000 * 30);
	}

	private updateInterval() {
		this.log(
			`It has been ${Math.floor(Date.now() / 1000) - this.lastChecked} seconds since the last check`,
		);

		if (Math.floor(Date.now() / 1000) - this.lastChecked > 60 * 60 * 3 - 15) {
			this.check();
		}
	}

	async check() {
		if (!this.updater) return;

		this.lastChecked = Math.floor(Date.now() / 1000);

		let update;

		try {
			update = await this.updater.checkForUpdatesAndNotify();
			this.log('found update', update);
		} catch (err) {
			this.log(err);
		}

		if (update && update.updateInfo) {
			this.updateAvailable =
				String(update.updateInfo.version) !== app.getVersion();
		}

		this.log('willUpdate', this.updateAvailable);

		// If update is found, stop checking
		if (this.updateAvailable && this.interval) {
			clearInterval(this.interval);
			this.interval = undefined;
		}
	}

	stop() {
		if (this.interval) clearInterval(this.interval);
	}
}
