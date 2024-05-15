import { app, ipcMain, BrowserWindow } from 'electron';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import path from 'path';
import { finalizeEvent, UnsignedEvent, VerifiedEvent } from 'nostr-tools/pure';
import { hexToBytes } from '@noble/hashes/utils';
import { encrypt, decrypt } from 'nostr-tools/nip04';
import { readJSONFile, writeJSONFile } from '../helpers/file.js';
import type Desktop from './index.js';

// NIP-07 permissions are represented by an integer:
// -1 means "reject"
// 0 means "ask"
// 1 menans "allow"
type Status = {
	t: number;
	v: number;
};

// Keep status in a kind of two dimensional map of (domain + action) to status
type Permissions<domain, action, Status> = Map<domain, Map<action, Status>>;

type PermissionRequest = {
	allow(): void;
	reject(): void;
};

export default class NIP07 {
	actions = ['getPublicKey', 'signEvent', 'getRelays', 'encrypt', 'decrypt'];
	permissions: Permissions<string, string, Status> = new Map();
	requestPermission: Map<string, PermissionRequest> = new Map();
	permissionsPath: string = path.join(
		app.getPath('userData'),
		'permissions.json',
	);
	desktop: Desktop;

	constructor(desktop: Desktop) {
		this.desktop = desktop;
		this.loadPermissions();

		// Resolve user choice from NIP-07 permission prompt
		ipcMain.handle('resolvePermission', (e, data) => {
			// Save always allow/deny if indicated
			if (data.save) {
				this.setPermission(data.domain, data.action, data.grant ? 1 : -1);
				this.savePermissions();
			}

			// Find the pending promise for user's
			// pending action and resolve/reject
			const pending = this.requestPermission.get(data.id);

			if (pending) {
				if (data.grant) {
					pending.allow();
				} else {
					pending.reject();
				}
			}
		});

		this.actions.forEach((action) => {
			ipcMain.handle(action, (...args) => {
				const params = args.slice(1);
				const domain = params[0];
				let requestedAction = action;
				let invokeAction: Promise<any>;

				// If user is requesting to sign event, limit
				// the scope of the authorization to that specifc
				// event kind — the model will automatically account
				// for the case where a blanket allow/deny policy exists
				if (action === 'signEvent') {
					if (!params[1] || typeof params[1].kind !== 'number') {
						return;
					}
					requestedAction = `signEvent:${params[1].kind}`;
				}

				const p = this.getPermission(domain, requestedAction);

				// If user always denies this action, return
				if (p === -1) {
					return;
				}

				switch (action) {
					// case 'getRelays':
					// invokeAction = this.getRelays();
					// break;
					case 'getPublicKey':
						invokeAction = this.getPublicKey();
						break;
					case 'signEvent':
						invokeAction = this.signEvent(params[1]);
						break;
					case 'encrypt':
						invokeAction = this.encryptNIP04(params[1], params[2]);
						break;
					case 'decrypt':
						invokeAction = this.decryptNIP04(params[1], params[2]);
						break;
					default:
						return;
				}

				console.log('invoke action...', invokeAction);

				// If user has granted permission, return
				// the invoked action, otherwise return
				// a promise that returns the invoked action
				// while saving a reference to the promise
				// and opening a modal to handle the request
				if (p === 1) {
					return invokeAction;
				} else {
					console.log('prompting...');

					// Generate an unguessable random ID to
					// represent this permission request
					const id = crypto.randomUUID();

					const modal = new BrowserWindow({
						parent: this.desktop.mainWindow,
						closable: true,
						minimizable: false,
						maximizable: false,
						show: false,
						height: 400,
						width: 600,

						// TODO load preload script with action to resolve permission
						// webPreferences: {
						// 	preload: path.join(__dirname, '../preload/app.js'),
						// },
					});

					// Open a dialog prompting user, passing params in the query string
					modal.loadURL(
						`file://${path.join(
							path.dirname(fileURLToPath(import.meta.url)),
							'../../views/PermissionRequest/index.html?' +
								[
									{
										key: 'domain',
										value: domain,
									},
									{
										key: 'call',
										value: action,
									},
									{
										key: 'id',
										value: id,
									},
									params.length > 1
										? {
												key: 'args',
												value: params,
											}
										: null,
								]
									.filter((item) => {
										return item;
									})
									.map((item) => {
										return `${item?.key}=${encodeURIComponent(typeof item?.value === 'string' ? item.value : JSON.stringify(item?.value))}`;
									})
									.join('&'),
						)}`,
					);

					modal.once('ready-to-show', () => {
						modal.show();
						//modal.webContents.openDevTools();
					});

					modal.on('close', () => {
						this.requestPermission.delete(id);
					});

					// Create a promise and save a reference to its
					// resolve/reject callbacks so they can be called
					// by the handler responding to the user's choice
					return new Promise((resolve, reject) => {
						this.requestPermission.set(id, {
							allow: () => {
								modal.close();
								resolve(invokeAction);
							},
							reject: () => {
								modal.close();
								reject();
							},
						});
					});
				}
			});
		});
	}

	getPublicKey(): Promise<string> {
		return new Promise((resolve, reject) => {
			this.desktop.identityManager.getActive().then((identity) => {
				if (identity) {
					resolve(identity.pubkey);
				} else {
					reject();
				}
			});
		});
	}

	// getRelays(): Promise<string[]> {
	//   // TODO
	// }

	signEvent(event: UnsignedEvent): Promise<VerifiedEvent> {
		return new Promise((resolve, reject) => {
			this.desktop.identityManager.getActive().then((identity) => {
				if (identity) {
					resolve(finalizeEvent(event, hexToBytes(identity.seckey)));
				} else {
					reject();
				}
			});
		});
	}

	encryptNIP04(pubkey: string, plaintext: string): Promise<string> {
		return new Promise((resolve, reject) => {
			this.desktop.identityManager.getActive().then((identity) => {
				if (identity) {
					resolve(encrypt(hexToBytes(identity.seckey), pubkey, plaintext));
				} else {
					reject();
				}
			});
		});
	}

	decryptNIP04(pubkey: string, ciphertext: string) {
		return new Promise((resolve, reject) => {
			this.desktop.identityManager.getActive().then((identity) => {
				if (identity) {
					resolve(decrypt(hexToBytes(identity.seckey), pubkey, ciphertext));
				} else {
					reject();
				}
			});
		});
	}

	// TODO NIP-44 support

	getPermission(domain: string, action: string): number {
		// If domain has been whitelisted bypass permission check
		if (
			domain &&
			this.desktop.config.values.NIP07TrustedDomains.includes(domain)
		) {
			return 1;
		}

		const status = this.permissions.get(domain)?.get(action);

		if (status) {
			// For sign event permission, authorize if user
			// has set a blanket policy for all event kinds
			if (action.indexOf('signEvent') === 0) {
				const generalSignPermission = this.permissions
					.get(domain)
					?.get('signEvent');
				if (generalSignPermission) {
					return generalSignPermission.v;
				}
			}

			return status.v;
		}

		return 0;
	}

	setPermission(domain: string, action: string, value: number): void {
		if (!this.permissions.has(domain)) {
			this.permissions.set(domain, new Map<string, Status>());
		}

		this.permissions.get(domain)?.set(action, {
			t: Math.floor(Date.now() / 1000),
			v: value,
		});

		// Setting a blanket policy for signEvent on any particular
		// domain supercedes and overwrites any other kind-specifc
		// policies that may have already been present
		if (action === 'signEvent') {
			Array.from(this.permissions.get(domain)?.keys() || []).forEach(
				(_action) => {
					if (_action.indexOf('signEvent') === 0 && _action !== 'signEvent') {
						this.permissions.get(domain)?.delete(_action);
					}
				},
			);
		}
	}

	revokePermission(domain: string, action: string): void {
		this.permissions.get(domain)?.delete(action);
	}

	savePermissions(): void {
		const obj: Record<string, Record<string, Status>> = {};
		this.permissions.forEach((actions, domain) => {
			obj[domain] = Object.fromEntries(actions);
		});
		writeJSONFile(JSON.stringify(obj), this.permissionsPath);
	}

	loadPermissions(): void {
		const savedPermissions = readJSONFile(this.permissionsPath);
		if (savedPermissions) {
			Object.entries(savedPermissions).forEach(
				([domain, actions]: [string, Record<string, Status>]) => {
					const status = new Map<string, Status>(Object.entries(actions));
					this.permissions.set(domain, status);
				},
			);
		}
	}
}
