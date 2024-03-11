const { app, BrowserWindow, powerMonitor } = require('electron');
const Actions = require('./actions');

// // https://www.electronforge.io/config/makers/squirrel.windows#handling-startup-events
// if (require('electron-squirrel-startup')) {
// 	app.quit();
// }

app.on('quit', () => {
	console.log('called quit handler');
	Actions.BeforeQuit();
	Actions.StopNode();
});

app.on('window-all-closed', () => {

  if (process.platform !== 'darwin') {
  	app.quit();
  }
});

app.whenReady().then(() => {

	//app.setName('Satellite');

	Actions.CreateLauncher();

	// Create node interface
	Actions.CreateNode();

	// Start local relay
	Actions.StartNode();

	// Create the view
	Actions.CreateView();

	// Create app menu and tray icon
	Actions.CreateMenu();

	// Create tray icon and context menu
	Actions.CreateTray();

	// Check release server for updates
	Actions.CheckRelease();

	app.on('activate', () => {

		if (BrowserWindow.getAllWindows().length === 0) {
			Actions.CreateView();
		}
	});

	powerMonitor.on('suspend', () => {

		console.log('CALLED suspend handler');

		Actions.StopNode();
	});

	powerMonitor.on('resume', () => {

		console.log('CALLED resume handler');

		// Restart the relay
		Actions.StartNode();
	});

});
