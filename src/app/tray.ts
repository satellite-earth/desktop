import { Menu, MenuItem, Tray, nativeImage } from 'electron';
import { fileURLToPath } from 'url';
import path from 'path';

import type Desktop from './index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const icon = nativeImage.createFromPath(
	path.join(__dirname, '../assets/tray.png'),
);

const runningIcon = nativeImage.createFromPath(
	path.join(__dirname, '../assets/green_circle.png'),
);
const stoppedIcon = nativeImage.createFromPath(
	path.join(__dirname, '../assets/red_circle.png'),
);

export default class TrayManager {
	tray: Tray;
	menu?: Menu;
	desktop: Desktop;

	localStatusItem: MenuItem;
	remoteStatusItem: MenuItem;

	constructor(desktop: Desktop) {
		this.desktop = desktop;

		this.tray = new Tray(
			icon.resize({
				height: 16,
				width: 16,
			}),
		);

		this.tray.setToolTip('Satellite Status');

		this.localStatusItem = new MenuItem({
			label: 'Local Relay Status',
			enabled: false,
		});

		this.remoteStatusItem = new MenuItem({
			label: 'Remote Status',
			enabled: false,
		});
	}

	setup() {
		this.desktop.node.on('started', () => {
			this.updateMenu();
		});
		this.desktop.node.on('stopped', () => {
			this.updateMenu();
		});

		this.desktop.node.on('listenerChange', () => {
			this.updateMenu();
		});

		this.updateMenu();
	}

	updateMenu() {
		this.menu = Menu.buildFromTemplate([
			this.desktop.node.started
				? {
						label: `Local Relay Active (port ${this.desktop.config.nodePort})`,
						icon: runningIcon,
					}
				: {
						label: `Local Relay Stopped`,
						icon: stoppedIcon,
					},
			this.desktop.node.listening
				? {
						label: 'Remote Listeners Active',
						icon: runningIcon,
					}
				: {
						label: 'Remote Listeners Disconnected',
						icon: stoppedIcon,
					},
			{
				label: 'Show Dashboard',
				click: () => {
					this.desktop.openDashboard();
				},
			},
			{ type: 'separator' },
			{
				label: 'Shutdown Satellite',
				role: 'quit',
			},
		]);

		this.tray.setContextMenu(this.menu);
	}
}
