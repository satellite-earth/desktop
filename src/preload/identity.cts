const { contextBridge, ipcRenderer } = require('electron');

/** API for desktop UI only */
contextBridge.exposeInMainWorld('desktop', {
	identity: {
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
		setActiveIdentity(pubkey: string) {
			ipcRenderer.invoke('setActiveIdentity', {
				pubkey,
			});
		},
		handleUpdate(callback: any) {
			return ipcRenderer.on('update', callback);
		},
	},
});
