import { readJSONFile, writeJSONFile } from './file.js';
import EventEmitter from 'events';

type ValueChanged = {
	value: any;
	key: string;
};

type EventMap = {
	changed: [ValueChanged];
};

export default class JSONFile<
	T extends Record<any, any> = {},
> extends EventEmitter<EventMap> {
	path: string;
	values: T;

	constructor(path: string, defaultValues?: T) {
		super();
		this.path = path;

		this.values = {
			...defaultValues,
			...readJSONFile<T>(this.path),
		} as T;
	}

	load(values: T): void {
		for (let key of Object.keys(values)) {
			let changing = this.values[key] !== values[key];

			if (changing) {
				// @ts-expect-error
				this.values[key] = values[key];
				this.emit('changed', {
					value: values[key],
					key,
				});
			}
		}
	}

	set(values: Partial<T>): void {
		for (let [key, value] of Object.entries(values)) {
			if (this.values[key] !== value) {
				// @ts-expect-error
				this.values[key] = value;
				this.emit('changed', { key, value });
			}
		}
	}

	save(values = this.values): void {
		this.load(values);
		writeJSONFile(this.values, this.path);
	}
}
