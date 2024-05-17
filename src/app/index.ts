import { BrowserWindow, ipcMain, powerMonitor, screen } from 'electron';
import { resolve as importMetaResolve } from 'import-meta-resolve';
import { fileURLToPath } from 'url';
import path from 'path';
import os from 'os';

import { IS_DEV, OVERRIDE_UI } from '../env.js';
import { logger } from '../logger.js';
import Config from './config.js';
import Node from '../interfaces/node.js';
import TrayManager from './tray.js';
import UpdateManager from './updates.js';
import MenuManager from './menu.js';
import SecretManager from './secrets.js';
import IdentityManager from './identities.js';
import NIP07 from './nip07.js';
import Launcher from './launcher.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default class Desktop {
	log = logger;
	node: Node;
	secretManager: SecretManager;
	identityManager: IdentityManager;
	nip07: NIP07;
	trayManager: TrayManager;
	updateManager?: UpdateManager;
	menuManager: MenuManager;
	config: Config;

	launcher: Launcher;

	mainWindow?: BrowserWindow;

	constructor() {
		this.config = new Config();

		this.secretManager = new SecretManager();

		this.identityManager = new IdentityManager(this);

		this.nip07 = new NIP07(this);

		this.trayManager = new TrayManager(this);

		this.node = new Node(this.config);
		this.node.on('message', (message) => {
			this.log('got ipc message from node', message);
		});
		this.node.on('error', (err) => {
			this.log('Node got an error');
			this.log(err);
		});

		// pause and resume the node on power changes
		powerMonitor.on('suspend', () => {
			this.log('CALLED suspend handler');
			this.node.stop();
		});
		powerMonitor.on('resume', () => {
			this.log('CALLED resume handler');
			this.node.start();
		});

		if (!IS_DEV) {
			this.log('Creating update manager');
			this.updateManager = new UpdateManager();
		}

		this.menuManager = new MenuManager(this);

		this.launcher = new Launcher(path.join(os.homedir(), 'pwa'));

		this.menuManager.setup();
		this.trayManager.setup();

		ipcMain.handle('get-satellite-config', () => ({
			localRelay: new URL(
				`ws://127.0.0.1:${this.config.values.nodePort}`,
			).toString(),
			adminAuth: this.config.values.auth,
		}));

		this.node.start().then(() => {
			this.openDashboard();
		});
	}

	private getOrCreateMainWindow() {
		if (!this.mainWindow) {
			const mainScreen = screen.getPrimaryDisplay();
			const { width, height } = mainScreen.size;

			this.mainWindow = new BrowserWindow({
				width,
				height,
				backgroundColor: '#171819',
				icon: path.join(__dirname, '../../assets/window.png'),
				webPreferences: {
					webSecurity: false,
					allowRunningInsecureContent: false,
					preload: path.join(__dirname, '../preload/main.cjs'),
				},
			});

			// @ts-expect-error
			if (IS_DEV) this.mainWindow.openDevTools();

			this.mainWindow.on('closed', () => {
				this.mainWindow = undefined;
			});
		}

		return this.mainWindow;
	}

	openDashboard() {
		const window = this.getOrCreateMainWindow();

		const url = new URL(
			OVERRIDE_UI ||
				importMetaResolve('@satellite-earth/community-ui', import.meta.url),
		);
		url.hash = `#/dashboard`;

		window.loadURL(url.toString());

		if (window.isVisible()) {
			window.show();
		}
	}

	openCommunity() {
		const window = this.getOrCreateMainWindow();

		const url = new URL(
			OVERRIDE_UI ||
				importMetaResolve('@satellite-earth/community-ui', import.meta.url),
		);

		window.loadURL(url.toString());

		if (window.isVisible()) {
			window.show();
		}
	}

	/*
	createModal(selector: string, windowOptions = {}) {
		const modal = new BrowserWindow({
			parent: this.mainWindow,
			...windowOptions,
		});

		const url = new URL(
			//`file://${path.join(__dirname, '../../../desktop-ui/dist/index.html#')}`,
		);

		url.hash = selector;
		modal.loadURL(url.toString());
		return modal;
	}
	*/

	shutdown() {
		this.node.stop();
	}
}
