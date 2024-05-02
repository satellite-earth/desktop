import { Menu, MenuItem, Tray, nativeImage } from 'electron';
import { fileURLToPath } from 'url';
import path from 'path';

import type Desktop from './index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default class TrayManager {
	tray: Tray;
	menu?: Menu;
	desktop: Desktop;

	constructor(desktop: Desktop) {
		this.desktop = desktop;

		const icon = nativeImage.createFromPath(
			path.join(__dirname, '../../assets/tray.png'),
		);
		this.tray = new Tray(
			icon.resize({
				height: 16,
				width: 16,
			}),
		);

		this.tray.setToolTip('Satellite Status');
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
		const runningIcon = nativeImage.createFromPath(
			path.join(__dirname, '../../assets/green_circle.png'),
		);
		const stoppedIcon = nativeImage.createFromPath(
			path.join(__dirname, '../../assets/red_circle.png'),
		);

		this.menu = Menu.buildFromTemplate([
			this.desktop.node.started
				? {
						label: `Local Relay Active (port ${this.desktop.config.nodePort})`,
						icon: runningIcon,
						enabled: false,
					}
				: {
						label: `Local Relay Stopped`,
						icon: stoppedIcon,
						enabled: false,
					},
			this.desktop.node.listening
				? {
						label: 'Remote Listeners Active',
						icon: runningIcon,
						enabled: false,
					}
				: {
						label: 'Remote Listeners Disconnected',
						icon: stoppedIcon,
						enabled: false,
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
