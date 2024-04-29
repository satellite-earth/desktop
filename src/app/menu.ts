import { Menu } from 'electron';

import type Desktop from './index.js';

export default class MenuManager {
	desktop: Desktop;
	menu?: Menu;

	constructor(desktop: Desktop) {
		this.desktop = desktop;
	}

	update() {
		// manually build satellite menu
		this.menu = Menu.buildFromTemplate([
			{
				label: 'Satellite',
				submenu: [
					{ role: 'about' },
					this.desktop.updateManager?.updateAvailable
						? {
								label: 'Check for updates',
								click: () => {
									this.desktop.updateManager?.check();
								},
							}
						: {
								label: 'Install update and restart',
								visible: !!this.desktop.updateManager?.updater,
								click: () => {
									this.desktop.updateManager?.updater?.quitAndInstall();
								},
							},
					{ type: 'separator' },
					{
						role: 'quit',
						label: 'Shutdown Satellite',
					},
				],
			},
			{
				label: 'Nostr',
				submenu: [
					{
						label: 'Open Application',
						click: () => {
							// global.launcher.open();
						},
					},
				],
			},
			{
				label: 'Edit',
				submenu: [
					{ role: 'undo' },
					{ role: 'redo' },
					{ role: 'cut' },
					{ role: 'copy' },
					{ role: 'paste' },
					{ role: 'selectAll' },
				],
			},
		]);

		Menu.setApplicationMenu(this.menu);
	}

	setup() {
		this.desktop.updateManager?.updater?.on('update-available', (info) => {
			this.update();
		});

		this.update();
	}
}
