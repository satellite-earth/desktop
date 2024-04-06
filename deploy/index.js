const { S3Client } = require('@aws-sdk/client-s3');
const { Upload } = require('@aws-sdk/lib-storage');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

require('dotenv').config();

const client = new S3Client({
	region: 'auto',
	endpoint: `https://${process.env.CF_ACCOUNT_ID}.r2.cloudflarestorage.com`,
	credentials: {
		secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
		accessKeyId: process.env.S3_ACCESS_KEY_ID
	}
});

const ReadFile = (filename) => {

	return fs.createReadStream(path.join(__dirname, `../build/${filename}`));
};

const UploadStream = async (data, options) => {

	// Initiate upload
	const uploading = new Upload({
		client,
		params: {
			Key: options.filename,
			Bucket: 'release',
			Body: data,
			...(options.headers || {})
		}
	});

	// Log upload progress
	uploading.on('httpUploadProgress', ({ loaded, total }) => {
		console.log(`${Math.floor((loaded / total) * 100)}%`);
	});

	console.log('UPLOADING ' + options.filename + ' . . .');

	// Await confirmation that the upload completed
	const resp = await uploading.done();

	console.log('UPLOADED ' + options.filename + '\n');
};

const ComputeHash = (filename) => {

	return new Promise(resolve => {

		const hash = crypto.createHash('sha256').setEncoding('hex');

		hash.on('finish', () => {
			hash.end();
			resolve(hash.read());
		});

		ReadFile(filename).pipe(hash);
	});
};

const blockmaps = [
	`Satellite-${process.env.npm_package_version}-mac.zip.blockmap`,
	`Satellite-${process.env.npm_package_version}-arm64-mac.zip.blockmap`,
	`Satellite-${process.env.npm_package_version}.dmg.blockmap`,
	`Satellite-${process.env.npm_package_version}-arm64.dmg.blockmap`,
];

const builds = [
	{
		name: `Satellite-${process.env.npm_package_version}-mac.zip`,
		arch: 'x64',
		platform: 'mac',
		manifest: false
	},
	{
		name: `Satellite-${process.env.npm_package_version}.dmg`,
		arch: 'x64',
		platform: 'mac',
		manifest: true
	},
	{
		name: `Satellite-${process.env.npm_package_version}.AppImage`,
		arch: 'x64',
		platform: 'linux',
		manifest: true
	},
	{
		name: `Satellite-${process.env.npm_package_version}-arm64-mac.zip`,
		arch: 'arm64',
		platform: 'mac',
		manifest: false
	},
	{
		name: `Satellite-${process.env.npm_package_version}-arm64.dmg`,
		arch: 'arm64',
		platform: 'mac',
		manifest: true
	},
	{
		name: `Satellite-${process.env.npm_package_version}-arm64.AppImage`,
		arch: 'arm64',
		platform: 'linux',
		manifest: true
	}
];

const yamls = [
	`latest-mac.yml`,
	`latest-linux.yml`,
	`latest-linux-arm64.yml`
];

const run = async () => {

	console.log('DEPLOYING VERSION ' + process.env.npm_package_version + ' . . .' + '\n');

	let error;

	// Try to upload all builds first
	for (let filename of blockmaps) {

		if (error) { break; }

		try {

			await UploadStream(ReadFile(filename), {
				filename
			});

		} catch (err) {
			console.log('ERROR UPLOADING ' + filename, err);
			error = err;
		}
	}

	if (!error) {

		// Try to upload all builds first
		for (let item of builds) {

			if (error) { break; }

			try {

				item.sha256 = await ComputeHash(item.name);

				console.log(`SHA256 ${item.sha256} (${item.name})`);

				await UploadStream(ReadFile(item.name), {
					filename: item.name
				});

			} catch (err) {
				console.log('ERROR UPLOADING ' + item.name, err);
				error = err;
			}
		}
	}

	// If all builds succeeded, upload manifests
	if (!error) {

		for (let item of yamls) {

			if (error) { break; }

			try {

				await UploadStream(ReadFile(item), {
					filename: item
				});

			} catch (err) {
				console.log('ERROR UPLOADING ' + item, err);
				error = err;
			}
		}		
	}

	try {

		const released = Math.floor(Date.now() / 1000);

		await UploadStream(Buffer.from(JSON.stringify(builds.filter(build => {
			return build.manifest;
		}).map(({ name, arch, platform, sha256 }) => {
			return {
				name,
				version: process.env.npm_package_version,
				released,
				platform,
				arch,
				sha256,
				url: `https://release.satellite.earth/${name}`
			};
		}))), {
			filename: 'manifest.json',
			headers: {
				ContentType: 'application/json'
			}
		});

	} catch (err) {
		console.log('ERROR UPLOADING latest.json ', err);
		error = err;
	}

	console.log(error ? 'DEPLOYMENT FAILURE' : 'DEPLOYMENT SUCCESS');
};

run();
