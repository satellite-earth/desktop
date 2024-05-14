const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('satellite', {
	launcher: {
		openApplication(params: any) {
			console.log('params', params);

			ipcRenderer.invoke('openApplication', {
				name: params.name.slice(0, -4),
			});
		},
		update: () => {
			console.log('CALLED update');
			ipcRenderer.invoke('update');
		},
		handleUpdate(callback: () => void) {
			return ipcRenderer.on('update', callback);
		},
	},
});
