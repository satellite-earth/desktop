import { ipcMain, screen, BrowserWindow } from 'electron';
import { fileURLToPath } from 'url';
import { ChildProcess, fork } from 'child_process';
import path from 'path';
import fs from 'fs';
import AdmZip from 'adm-zip';
import { logger } from '../logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/* Launch other nostr apps */
export default class Launcher {
	log = logger.extend('pwa-launcher');
	directory: string;

	pickerWindow: BrowserWindow;
	servers: Record<string, ChildProcess> = {};

	constructor(directory: string) {
		this.directory = directory;

		this.pickerWindow = new BrowserWindow({
			title: 'Launch Nostr App',
			closable: true,
			minimizable: false,
			maximizable: false,
			show: false,
			height: 350,
			width: 450,
			backgroundColor: '#000',
			webPreferences: {
				preload: path.join(__dirname, '../preload/launcher.cjs'),
			},
		});

		ipcMain.handle('update', () => {
			const files = fs.readdirSync(this.directory);

			this.pickerWindow.webContents.send('update', {
				files,
			});
		});

		ipcMain.handle('openApplication', (e, params) => {
			this.start(params.name);

			this.pickerWindow.close();
		});
	}

	open() {
		// Open a dialog prompting user, passing params in the query string
		this.pickerWindow.loadFile(
			path.join(__dirname, '../views/AppLauncher/index.html'),
		);

		this.pickerWindow.once('ready-to-show', () => {
			this.pickerWindow.show();
			this.pickerWindow.focus();
		});
	}

	start(name: string) {
		const appPath = path.join(this.directory, `${name}.pwa`);
		const dirPath = path.join(this.directory, name);

		// TODO maybe do some safety checks to ensure
		// that the .pwa file actually exits

		if (!fs.existsSync(dirPath)) {
			this.log(`Creating ${dirPath}`);
			fs.mkdirSync(dirPath);
		}

		const zip = new AdmZip(appPath);

		zip.extractAllTo(dirPath);

		const url = this.serve(name, dirPath);

		const mainScreen = screen.getPrimaryDisplay();
		const { width, height } = mainScreen.size;

		const pwa = new BrowserWindow({
			width: width - 100,
			height: height - 100,
			backgroundColor: '#000',
		});

		pwa.on('closed', () => {
			this.stop(name);
		});

		// TODO: this timeout thing is a hack, need to find way
		// of reliably detecting when the server has started
		setTimeout(() => {
			pwa.loadURL(url);
		}, 500);
	}

	serve(name: string, dir: string) {
		const port = 3012 + Object.keys(this.servers).length;

		// TODO assigning the port needs to be more robust to
		// make sure the port is not already being used

		this.servers[name] = fork(
			`./node_modules/.bin/http-server`,
			[dir, `--port=${port}`],
			{},
		);

		return `http://127.0.0.1:${port}`;
	}

	stop(name: string) {
		if (!this.servers[name]) return;

		this.servers[name].kill('SIGINT');
	}

	stopAll() {
		for (let name of Object.keys(this.servers)) {
			this.stop(name);
		}
	}
}
