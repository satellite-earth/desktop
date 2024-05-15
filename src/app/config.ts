import { app } from 'electron';
import path from 'path';
import { randomBytes } from 'crypto';

import JSONFile from '../helpers/jsonfile.js';

type ConfigDefaults = {
	auth: string;
	nodePort: number;
	activeIdentity: string;
	NIP07TrustedDomains: string[];
};

const DEFAULT_FILENAME = 'config.json';

const DEFAULT_VALUES: ConfigDefaults = {
	auth: randomBytes(20).toString('hex'),
	nodePort: 2012,
	activeIdentity: '',
	NIP07TrustedDomains: ['local'],
};

export default class Config extends JSONFile {
	constructor(filename = DEFAULT_FILENAME) {
		super(path.join(app.getPath('userData'), filename), DEFAULT_VALUES);
	}
}
