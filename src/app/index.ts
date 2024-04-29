import { powerMonitor } from 'electron';
import path from 'path';
import os from 'os';

import { IS_DEV } from '../env.js';
import { logger } from '../logger.js';
import config from './config.js';
import Node from '../interfaces/node.js';
import TrayManager from './tray.js';
import UpdateManager from './updates.js';
import MenuManager from './menu.js';
import DashboardWindow from './dashboard.js';
import Launcher from './launcher.js';

export default class Desktop {
	log = logger;
	node: Node;
	trayManager: TrayManager;
	updateManager?: UpdateManager;
	menuManager: MenuManager;
	config = config;

	launcher: Launcher;
	dashboard?: DashboardWindow;

	constructor() {
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

		this.node.start();
		this.menuManager.setup();
		this.trayManager.setup();

		this.openDashboard();
	}

	openDashboard() {
		if (!this.dashboard) {
			this.dashboard = new DashboardWindow(this.config);
		}

		if (this.dashboard.isVisible()) {
			this.dashboard.show();
			this.dashboard.focus();
		}
	}
	closeDashboard() {
		if (this.dashboard) {
			this.dashboard.close();
		}
	}

	shutdown() {
		this.node.stop();
	}
}
