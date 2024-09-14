import { ipcMain } from 'electron';
import EventEmitter from 'events';
import { generateSecretKey, getPublicKey } from 'nostr-tools/pure';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils';
import Desktop from './index.js';
import { nip19 } from 'nostr-tools';

type IdentityItem = {
	pubkey: string;
	seckey: string;
	active: boolean;
};

type EventMap = {
	'active:changed': [string];
};

// Manage identities
export default class IdentityManager extends EventEmitter<EventMap> {
	KEYSTORE_NAME = 'SatelliteIdentity';
	desktop: Desktop;
	ui: any;

	constructor(desktop: Desktop) {
		super();
		this.desktop = desktop;

		ipcMain.handle('addIdentity', (e, data) => {
			this.addIdentity(data.seckey).then((identity) => {
				this.setActive(identity.pubkey);
			});
		});

		ipcMain.handle('newIdentity', (e, data) => {
			this.newIdentity().then((identity) => {
				this.setActive(identity.pubkey);
			});
		});

		ipcMain.handle('removeIdentity', (e, data) => {
			this.removeIdentity(data.pubkey).then(() => {});
		});

		ipcMain.handle('setActiveIdentity', (e, data) => {
			this.setActive(data.pubkey);
		});

		// emit active:changed event when activeIdentity in config changes
		this.desktop.config.on('changed', ({ key }) => {
			if (key === 'activeIdentity') {
				this.emit('active:changed', this.desktop.config.values.activeIdentity);
			}
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

		// Save the active identity in the config
		this.desktop.config.set({
			activeIdentity: active ? pkhex : '',
		});

		this.desktop.config.save();
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

				let pubkey = '';

				// Try to derive the pubkey
				try {
					pubkey = getPublicKey(hexToBytes(skhex));
				} catch (err) {}

				if (!pubkey) {
					reject();
					return;
				}

				const active = this.isActive(pubkey);

				if (unique) {
					this.desktop.secretManager
						.setItem(this.KEYSTORE_NAME, pubkey, skhex)
						.then(() => {
							resolve({
								active,
								pubkey,
								seckey: skhex,
							});
						});
				} else {
					resolve({
						active,
						pubkey,
						seckey: skhex,
					});
				}
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
