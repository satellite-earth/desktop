const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('satellite', {
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
