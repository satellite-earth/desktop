import { readJSONFile, writeJSONFile } from './file.js';
import EventEmitter from 'events';

type ValueChanged = {
	value: any;
	key: string;
};

type EventMap = {
	'event:changed': [ValueChanged];
};

export default class JSONFile extends EventEmitter<EventMap> {
	path: string;
	values: any = {};

	constructor(path: string, defaultValues = {}) {
		super();
		this.path = path;
		this.load({
			...defaultValues,
			...(readJSONFile(this.path) || {}),
		});
	}

	load(values: any = {}): void {
		for (let key of Object.keys(values)) {
			let changing = this.values[key] !== values[key];
			console.log('changing', key, changing);
			if (changing) {
				this.values[key] = values[key];
				this.emit('event:changed', {
					value: values[key],
					key,
				});
			}
		}
	}

	save(values = {}): void {
		this.load(values);
		writeJSONFile(this.values, this.path);
	}
}
