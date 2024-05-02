import { BrowserWindow, ipcMain, screen } from 'electron';
import { resolve as importMetaResolve } from 'import-meta-resolve';
import { fileURLToPath } from 'url';
import path from 'path';

import { IS_DEV } from '../env.js';
import type Desktop from './index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default class DashboardWindow extends BrowserWindow {
	window: BrowserWindow | null = null;

	constructor(config: Desktop['config']) {
		const mainScreen = screen.getPrimaryDisplay();
		const { width, height } = mainScreen.size;

		super({
			width,
			height,
			backgroundColor: '#171819',
			icon: path.join(__dirname, '../assets/logo.png'),
			webPreferences: {
				webSecurity: false,
				allowRunningInsecureContent: false,
				preload: path.join(__dirname, '../preload/satellite.cjs'),
			},
		});

		const guiURL = new URL(
			importMetaResolve('@satellite-earth/dashboard-ui', import.meta.url),
		);
		guiURL.searchParams.set('url', `ws://127.0.0.1:${config.nodePort}`);
		guiURL.searchParams.set('auth', config.auth);
		guiURL.searchParams.set('env', 'local');

		this.loadURL(guiURL.toString());

		// @ts-expect-error
		if (IS_DEV) this.openDevTools();
	}
}
