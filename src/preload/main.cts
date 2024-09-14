const { contextBridge, ipcRenderer } = require('electron');

// Constant 'local' is a special domain for signing
// permissions given to the Satellite app itself
// as defined by `trustedDomains` in the config
const NIP07_TRUSTED_DOMAIN = 'local';

// Inject NIP-07 interface
contextBridge.exposeInMainWorld('nostr', {
	getPublicKey: () => {
		return ipcRenderer.invoke('getPublicKey', NIP07_TRUSTED_DOMAIN);
	},
	signEvent: (data: any) => {
		return ipcRenderer.invoke('signEvent', NIP07_TRUSTED_DOMAIN, data);
	},
	getRelays: () => {
		return ipcRenderer.invoke('getRelays', NIP07_TRUSTED_DOMAIN);
	},
	nip04: {
		encrypt: (pubkey: string, plaintext: string) => {
			return ipcRenderer.invoke(
				'encrypt',
				NIP07_TRUSTED_DOMAIN,
				pubkey,
				plaintext,
			);
		},
		decrypt: (pubkey: string, ciphertext: string) => {
			return ipcRenderer.invoke(
				'decrypt',
				NIP07_TRUSTED_DOMAIN,
				pubkey,
				ciphertext,
			);
		},
	},
});

contextBridge.exposeInMainWorld('satellite', {
	// TODO should namespace these handlers like in
	// the other preload scripts
	getLocalRelay: async () =>
		(await ipcRenderer.invoke('get-satellite-config')).localRelay,
	getAdminAuth: async () =>
		(await ipcRenderer.invoke('get-satellite-config')).adminAuth,
	newIdentity() {
		ipcRenderer.invoke('newIdentity');
	},
	addIdentity(seckey: string) {
		ipcRenderer.invoke('addIdentity', {
			seckey,
		});
	},
	removeIdentity(pubkey: string) {
		ipcRenderer.invoke('removeIdentity', {
			pubkey,
		});
	},
});
