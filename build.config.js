module.exports = {
	appId: 'earth.satellite.node',
	productName: 'Satellite',
	directories: {
		output: './build',
	},
	files: ['**/*'],
	extraResources: [
		{
			from: '../satellite-node',
			to: 'satellite-node',
		},
		{
			from: '../satellite-control/dist',
			to: 'control',
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
