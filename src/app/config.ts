import { app } from 'electron';
import path from 'path';
import { randomBytes } from 'crypto';

import { readJSONFile, writeJSONFile } from '../helpers/file.js';
import { logger } from '../logger.js';

const log = logger.extend('config');
const configPath = path.join(app.getPath('userData'), 'config.json');

const config = {
	auth: randomBytes(20).toString('hex'),
	nodePort: 2012,
};

const loaded = readJSONFile(configPath);
if (loaded) {
	Object.assign(config, loaded);
} else {
	log('Creating default config');
	writeJSONFile(config, configPath);
}

export default config;
