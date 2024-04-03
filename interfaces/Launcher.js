import { ipcMain, screen, BrowserWindow } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { fork } from 'child_process';
import AdmZip from 'adm-zip';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/* Launch other nostr apps */
export default class Launcher {
	constructor(config = {}) {
		this.config = config;
		this.servers = {};

		ipcMain.handle('update', () => {
			const files = fs.readdirSync(this.config.path);

			this.modal.webContents.send('update', {
				files,
			});
		});

		ipcMain.handle('openApplication', (e, params) => {
			this.start({
				name: params.name,
			});

			this.modal.close();
		});
	}

	open() {
		this.modal = new BrowserWindow({
			title: 'Launch Nostr App',
			parent: view,
			closable: true,
			minimizable: false,
			maximizable: false,
			show: false,
			height: 350,
			width: 450,
			backgroundColor: '#000',
			webPreferences: {
				preload: path.join(__dirname, '../preload/launcher.js'),
			},
		});

		// Open a dialog prompting user, passing params in the query string
		//this.modal.loadURL(`file://${path.join(__dirname, '/views/AppLauncher/index.html')}`);
		this.modal.loadFile(
			path.join(__dirname, '../views/AppLauncher/index.html'),
		);

		this.modal.once('ready-to-show', () => {
			this.modal.show();
			//this.modal.webContents.openDevTools();
		});
	}

	start({ name }) {
		const appPath = path.join(this.config.path, `${name}.pwa`);
		const dirPath = path.join(this.config.path, name);

		// TODO maybe do some safety checks to ensure
		// that the .pwa file actually exits

		if (!fs.existsSync(dirPath)) {
			console.log(`Creating ${dirPath}`);
			fs.mkdirSync(dirPath);
		}

		const zip = new AdmZip(appPath);

		zip.extractAllTo(dirPath);

		const params = this.serve({
			path: dirPath,
			name,
		});

		const mainScreen = screen.getPrimaryDisplay();
		const { width, height } = mainScreen.size;

		const pwa = new BrowserWindow({
			width: width - 100,
			height: height - 100,
			backgroundColor: '#000',
		});

		pwa.on('closed', () => {
			// TODO shutdown serve process

			this.stop(name);
		});

		// TODO this timeout thing is a hack, need to find way
		// of reliably detecting when the server has started

		setTimeout(() => {
			pwa.loadURL(params.url);
		}, 500);
	}

	serve({ name, path }) {
		const port = 3012 + Object.keys(this.servers).length;

		// TODO assigning the port needs to be more robust to
		// make sure the port is not already being used

		this.servers[name] = fork(
			`./node_modules/.bin/http-server`,
			[path, `--port=${port}`],
			{},
		);

		return {
			url: `http://127.0.0.1:${port}`,
		};
	}

	stop(name) {
		if (!this.servers[name]) {
			return;
		}

		this.servers[name].kill('SIGINT');
	}

	stopAll(params) {
		for (let name of Object.keys(this.servers)) {
			this.stop(name);
		}
	}
}
