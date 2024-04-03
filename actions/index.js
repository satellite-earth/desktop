import {
	app,
	BrowserWindow,
	screen,
	Menu,
	Tray,
	nativeImage,
	ipcMain,
} from 'electron';
import logger from 'electron-log';
import { MacUpdater, AppImageUpdater } from 'electron-updater';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import os from 'os';

import Launcher from '../interfaces/Launcher.js';
import Node from '../interfaces/Node.js';
import { IS_DEV, OVERRIDE_UI } from '../env.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const BeforeQuit = () => {
	clearInterval(global._satelliteCheckForUpdatesInterval);

	global.launcher.stopAll();
};

const CheckRelease = () => {
	if (IS_DEV) {
		console.log('skipped update check in dev');
		return;
	}

	clearInterval(global._satelliteCheckForUpdatesInterval);

	global._satelliteLastCheckedUpdate = 0;

	if (global._satelliteAutoUpdater) {
		global._satelliteAutoUpdater.removeAllListeners();
		global._satelliteAutoUpdater = null;
	}

	const options = {
		provider: 's3',
		region: 'auto',
		bucket: '',
		path: '',
		endpoint: 'https://release.satellite.earth',
	};

	if (process.platform === 'darwin') {
		global._satelliteAutoUpdater = new MacUpdater(options);

		console.log('created mac updater');
	} else if (process.platform === 'win32') {
		// TODO windows updater
	} else {
		global._satelliteAutoUpdater = new AppImageUpdater(options);
		console.log('created linux updater');
	}

	if (!global._satelliteAutoUpdater) {
		console.log('failed to create autoUpdater for ' + process.platform);
		return;
	}

	global._satelliteAutoUpdater.on('update-downloaded', (info) => {
		console.log('Update downloaded');
		global._satelliteUpdateDownloaded = true;
		CreateMenu();
	});

	//autoUpdater.forceDevUpdateConfig = true;

	global._satelliteAutoUpdater.logger = logger;
	global._satelliteAutoUpdater.logger.transports.file.level = 'debug';

	const checkForUpdatesAndNotify = async () => {
		global._satelliteLastCheckedUpdate = Math.floor(Date.now() / 1000);

		let update;

		try {
			update = await global._satelliteAutoUpdater.checkForUpdatesAndNotify();
			console.log('found update', update);
		} catch (err) {
			console.log(err);
		}

		let willUpdate = false;

		if (update && update.updateInfo) {
			willUpdate =
				String(update.updateInfo.version) !== String(app.getVersion());
		}

		console.log('willUpdate', willUpdate);

		// If update is found, stop checking
		if (willUpdate) {
			clearInterval(global._satelliteCheckForUpdatesInterval);
		}
	};

	// Every 30 seconds, check to see if the last time satellite checked
	// for an update was more than 3 hours ago. If it was, check again.
	// The reason for this double interval is so the app will effectively
	// check on resume (some users might never actually restart Satellite
	// and might not have their device on for 3 hours at a time very often)
	global._satelliteCheckForUpdatesInterval = setInterval(() => {
		console.log(
			'It has been ' +
				(Math.floor(Date.now() / 1000) - global._satelliteLastCheckedUpdate) +
				' seconds since the last check',
		);

		if (
			Math.floor(Date.now() / 1000) - global._satelliteLastCheckedUpdate >
			60 * 60 * 3 - 15
		) {
			checkForUpdatesAndNotify();
		}
	}, 1000 * 30);

	checkForUpdatesAndNotify();
};

const LoadJson = (params) => {
	let object;

	try {
		const data = fs.readFileSync(params.path);

		object = JSON.parse(data.toString('utf8'));
	} catch (err) {
		console.log(err);
	}

	if (object) {
		return object;
	}
};

const SaveJson = (data, params) => {
	try {
		fs.writeFileSync(params.path, Buffer.from(JSON.stringify(data)));
	} catch (err) {
		console.log(err);
	}
};

const CreateLauncher = () => {
	global.launcher = new Launcher({
		path: path.join(os.homedir(), 'pwa'),
	});

	// TODO ip handle open app
};

const CreateMenu = () => {
	const osx = process.platform === 'darwin';

	const updateItem = () => {
		return global._satelliteUpdateDownloaded
			? {
					label: 'Update Downloaded - Click to Install and Relauch',
					click: () => {
						if (global._satelliteAutoUpdater) {
							global._satelliteAutoUpdater.quitAndInstall();
						}
					},
				}
			: {
					label: 'Check for Updates...',
					click: () => {
						console.log('called check for updates');
						CheckRelease();
					},
				};
	};

	/* Create Main Menu */

	const template = [
		{
			label: 'Satellite',
			submenu: [
				{ role: 'about' },
				updateItem(),
				// {
				// 	label: 'Check for Updates...',
				// 	click: () => {
				// 		// Call your custom function here
				// 		//checkForUpdates();
				// 		console.log('called check for updates');
				// 		CheckRelease();
				// 	}
				// },
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
					label: 'Open Application...',
					click: () => {
						global.launcher.open();
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
	];

	const menu = Menu.buildFromTemplate(template);

	Menu.setApplicationMenu(menu);
};

const CreateNode = () => {
	const env = LoadConfig();

	global.relay = new Node(env, (event) => {
		console.log('electron got ipc message from node', event);

		switch (event.type) {
			// Update the tray status indicator
			// when local relay active state or
			// remote listening state changes
			case 'STARTED':
			case 'STOPPED':
			case 'LISTENER_STATE':
				CreateTray();
				break;

			default:
				break;
		}
	});
};

const CreateTray = () => {
	console.log('called CreateTray, relay.listening = ', relay.listening);

	if (!relay) {
		return;
	}

	/* Create Tray Menu */

	const dynamicItems = {
		localStatus: () => {
			return {
				label: relay.started
					? `Local Relay Active (port ${relay.config.port})`
					: 'Local Relay Starting. . .',
				icon: relay.started
					? path.join(__dirname, '../assets/green_circle.png')
					: undefined,
				enabled: false,
			};
		},

		remoteStatus: () => {
			return {
				label: relay.listening
					? 'Remote Listeners Active'
					: 'Remote Listeners Disconnected',
				icon: relay.listening
					? path.join(__dirname, '../assets/green_circle.png')
					: undefined,
				enabled: false,
			};
		},
	};

	if (!global.tray) {
		// Create context menu

		const icon = nativeImage.createFromPath(
			path.join(__dirname, '../assets/tray.png'),
		);

		global.tray = new Tray(
			icon.resize({
				height: 16,
				width: 16,
			}),
		);

		tray.setToolTip('Satellite Status');
	}

	const build = () => {
		tray.setContextMenu(
			Menu.buildFromTemplate([
				dynamicItems.localStatus(),
				dynamicItems.remoteStatus(),
				{
					label: 'Show Dashboard...',
					click: () => {
						if (view.isDestroyed()) {
							CreateView();
						} else {
							view.show();
							view.focus();
						}
					},
				},
				{ type: 'separator' },
				{
					label: 'Shutdown Satellite',
					role: 'quit',
				},
			]),
		);
	};

	build();
};

const CreateView = () => {
	const mainScreen = screen.getPrimaryDisplay();
	const { width, height } = mainScreen.size;

	// TODO: move to a more better place
	ipcMain.handle('get-satellite-config', () => ({
		localRelay: new URL(`ws://127.0.0.1:${env.PORT}`).toString(),
		adminAuth: env.AUTH,
	}));

	// Create the main application window
	const view = new BrowserWindow({
		width,
		height,
		backgroundColor: '#171819',
		icon: path.join(__dirname, '../assets/logo.png'),
		webPreferences: {
			webSecurity: false,
			allowRunningInsecureContent: false,
			preload: path.join(__dirname, '../preload/satellite.js'),
		},
		// x: 0, // dev only
		// y: 0 // dev only
	});

	const env = LoadConfig();
	const auth = encodeURIComponent(env.AUTH);
	const url = encodeURIComponent(`ws://127.0.0.1:${env.PORT}`);
	const htmlPath = IS_DEV
		? path.join(__dirname, '../../dashboard-ui/dist/index.html')
		: path.join(process.resourcesPath, 'dashboard-ui/index.html');
	const guiURL = `file://${htmlPath}?auth=${auth}&url=${url}&env=local`;

	view.loadURL(OVERRIDE_UI || guiURL);

	if (IS_DEV) view.openDevTools();

	global.view = view;
};

const LoadConfig = () => {
	const file = path.join(app.getPath('userData'), 'config.json');
	let env = LoadJson({ path: file });

	if (!env) {
		env = {
			AUTH: crypto.randomBytes(20).toString('hex'),
			PORT: 2001,
		};

		SaveJson(env, { path: file });
	}

	return env;
};

const StartNode = () => {
	if (!relay) {
		return;
	}

	relay.start();
};

const StopNode = () => {
	if (!relay) {
		return;
	}

	relay.stop();

	relay.process = null;
};

export {
	BeforeQuit,
	CheckRelease,
	CreateLauncher,
	CreateMenu,
	CreateNode,
	CreateTray,
	CreateView,
	LoadConfig,
	StartNode,
	StopNode,
};
