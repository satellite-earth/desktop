import { ipcMain, BrowserWindow } from 'electron';
import EventEmitter from 'events';
import { fileURLToPath } from 'url';
import path from 'path';
import { generateSecretKey, getPublicKey } from 'nostr-tools/pure';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils';
import Desktop from './index.js';
import { nip19 } from 'nostr-tools';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

type IdentityItem = {
	pubkey: string;
	seckey: string;
	active: boolean;
};

// Manage identities
export default class IdentityManager extends EventEmitter {
	// TODO: emit event when active identity changes so
	// things that need to reload can listen for that

	KEYSTORE_NAME = 'SatelliteIdentity';
	desktop: Desktop;
	ui: any;

	constructor(desktop: Desktop) {
		super();
		this.desktop = desktop;

		ipcMain.handle('addIdentity', (e, data) => {
			this.addIdentity(data.seckey).then((identity) => {
				this.setActive(identity.pubkey);
				this.updateUI();
			});
		});

		ipcMain.handle('newIdentity', (e, data) => {
			this.newIdentity().then((identity) => {
				this.setActive(identity.pubkey);
				this.updateUI();
			});
		});

		ipcMain.handle('removeIdentity', (e, data) => {
			this.removeIdentity(data.pubkey).then(() => {
				this.updateUI();
			});
		});

		ipcMain.handle('setActiveIdentity', (e, data) => {
			this.setActive(data.pubkey);
			this.updateUI();
		});
	}

	protected normalizeKeyToHex(s: string): string {
		let hex = '';

		if (s.startsWith('nsec') || s.startsWith('npub')) {
			try {
				hex = bytesToHex(nip19.decode(s).data as Uint8Array);
			} catch (err) {}
		} else {
			hex = s;
		}

		return hex;
	}

	protected updateUI(): void {
		if (!this.ui || this.ui.isDestroyed()) {
			return;
		}

		this.listIdentities().then((identities) => {
			this.ui.webContents.send('update', {
				identities,
			});
		});
	}

	show(): void {
		/*
		this.ui = this.desktop.createModal('identity', {
			closable: true,
			minimizable: false,
			maximizable: false,
			show: false,
			height: 600,
			width: 800,
			webPreferences: {
				preload: path.join(__dirname, `../preload/identity.cjs`),
			},
		});

		// Show the ui and init with data
		this.ui.once('ready-to-show', () => {
			this.ui.show();
			this.ui.openDevTools();
			this.updateUI();
		});
		*/
	}

	listIdentities(): Promise<IdentityItem[]> {
		return new Promise((resolve) => {
			this.desktop.secretManager.listItems(this.KEYSTORE_NAME).then((items) => {
				resolve(
					items.map(({ key, value }) => {
						return {
							pubkey: key,
							seckey: value,
							active: this.isActive(key),
						};
					}),
				);
			});
		});
	}

	isActive(pubkey: string): boolean {
		return pubkey === this.desktop.config.values.activeIdentity;
	}

	getActive(): Promise<IdentityItem | null> {
		return new Promise((resolve) => {
			this.listIdentities().then((items) => {
				let active = null;
				for (let item of items) {
					if (item.active) {
						active = item;
						break;
					}
				}
				resolve(active);
			});
		});
	}

	setActive(pubkey: string, active: boolean = true): void {
		const pkhex = this.normalizeKeyToHex(pubkey);

		if (!pkhex) {
			return;
		}

		this.desktop.config.save({
			activeIdentity: active ? pkhex : '',
		});
	}

	newIdentity(): Promise<IdentityItem> {
		return this.addIdentity(bytesToHex(generateSecretKey()));
	}

	addIdentity(seckey: string): Promise<IdentityItem> {
		return new Promise((resolve, reject) => {
			const skhex = this.normalizeKeyToHex(seckey);

			if (!skhex) {
				reject();
				return;
			}

			this.listIdentities().then((items) => {
				let unique = true;

				// Check to prevent duplicate identities
				for (let item of items) {
					if (item.seckey === skhex) {
						unique = false;
						break;
					}
				}

				if (!unique) {
					reject();
					return;
				}

				let pubkey = '';

				// Try to derive the pubkey
				try {
					pubkey = getPublicKey(hexToBytes(skhex));
				} catch (err) {}

				if (!pubkey) {
					reject();
					return;
				}

				this.desktop.secretManager
					.setItem(this.KEYSTORE_NAME, pubkey, skhex)
					.then(() => {
						resolve({
							pubkey,
							seckey: skhex,
							active: this.isActive(pubkey),
						});
					});
			});
		});
	}

	removeIdentity(pubkey: string): Promise<boolean> {
		return new Promise((resolve) => {
			const pkhex = this.normalizeKeyToHex(pubkey);
			this.getActive().then((active) => {
				// If pubkey being removed is active,
				// change its status to inactive
				if (pkhex === active?.pubkey) {
					this.setActive(pkhex, false);
				}
				this.desktop.secretManager
					.deleteItem(this.KEYSTORE_NAME, pkhex)
					.then(resolve);
			});
		});
	}
}
