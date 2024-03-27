const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('satellite', {
	getLocalRelay: async () =>
		(await ipcRenderer.invoke('get-satellite-config')).localRelay,
	getAdminAuth: async () =>
		(await ipcRenderer.invoke('get-satellite-config')).adminAuth,
});
