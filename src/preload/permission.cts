import { contextBridge, ipcRenderer } from 'electron';

// Used by NIP-07 permission request modal
contextBridge.exposeInMainWorld('satellite', {
	nip07: {
		resolvePermission: (data: any) => {
			return ipcRenderer.invoke('resolvePermission', data);
		},
	},
});
