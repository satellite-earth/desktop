const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('launcher', {
	openApplication: (params) => {
		console.log('params', params);

		ipcRenderer.invoke('openApplication', {
			name: params.name.slice(0, -4),
		});
	},

	update: () => {
		console.log('CALLED update');

		ipcRenderer.invoke('update');
	},

	handleUpdate: (callback) => {
		return ipcRenderer.on('update', callback);
	},
});

// setTimeout(() => {

// 	console.log('timeout fired');

// 	window.launcher.update();

// 	console.log('called update');

// });
