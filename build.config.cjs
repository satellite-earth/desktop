module.exports = {
	appId: 'earth.satellite.node',
	productName: 'Satellite',
	directories: {
		output: './build',
	},
	// extraResources: [
	// 	{
	// 		from: '../core',
	// 		to: 'core',
	// 		filter: ['**/*', '!**/{.DS_Store,.env,.git}'],
	// 	},
	// 	{
	// 		from: '../private-node',
	// 		to: 'private-node',
	// 		filter: ['**/*', '!**/{.DS_Store,.env,.git}'],
	// 	},
	// 	{
	// 		from: '../dashboard-ui/dist',
	// 		to: 'dashboard-ui',
	// 	},
	// ],
	mac: {
		icon: 'assets/icon.icns',
		// target: [
		// 	{
		// 		target: 'dmg',
		// 		arch: [ 'x64', 'arm64' ]
		// 	},
		// 	{
		// 		target: 'zip',
		// 		arch: [ 'x64', 'arm64' ]
		// 	}
		// ]
	},
	linux: {
		target: 'AppImage',
	},
	// win: {
	// 	target: [
	// 		{
	// 			target: 'nsis',
	// 			arch: [ 'x64' ]
	// 		}
	// 	]
	// },
	publish: {
		provider: 's3',
		bucket: 'release',
		region: 'auto',
		path: '/',
		endpoint: 'https://release.satellite.earth',
	},
	includeSubNodeModules: true,
};
