import fs from 'fs';

export function readJSONFile<T = unknown>(filepath: string) {
	try {
		return JSON.parse(fs.readFileSync(filepath, { encoding: 'utf-8' })) as T;
	} catch (err) {}
}

export function writeJSONFile(data: any, filepath: string) {
	fs.writeFileSync(filepath, JSON.stringify(data), { encoding: 'utf-8' });
}
