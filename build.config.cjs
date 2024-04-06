// change build script back
// "build": "electron-builder build --config build.config.cjs --mac --linux --x64 --arm64 --publish never"


module.exports = {
	appId: 'earth.satellite.node',
	productName: 'Satellite',
	directories: {
		output: './build',
	},
	files: ['**/*'],
	extraResources: [
		{
			from: '../core',
			to: 'core',
			filter: [
				'**/*',
				'!**/{.DS_Store,.env,.git}',
			],
		},
		{
			from: '../private-node',
			to: 'private-node',
			filter: [
				'**/*',
				'!**/{.DS_Store,.env,.git}',
			],
		},
		{
			from: '../dashboard-ui/dist',
			to: 'dashboard-ui',
		},
		{
			from: 'bindings',
			to: 'bindings',
		},
	],
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
		// target: [
		// 	{
		// 		target: 'AppImage',
		// 		arch: [ 'x64' ]
		// 	}
		// ]
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
};
