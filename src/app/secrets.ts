import keytar from 'keytar';

type SecretItem = {
	key: string;
	value: string;
};

// Interface to list/set/get/delete secrets using
// the operating system's available secure store
export default class SecretManager {
	constructor() {}

	listItems(service: string): Promise<SecretItem[]> {
		return new Promise((resolve) => {
			keytar.findCredentials(service).then((items) => {
				resolve(
					items.map(({ account, password }) => {
						return { key: account, value: password };
					}),
				);
			});
		});
	}

	getItem(service: string, key: string): Promise<string | null> {
		return keytar.getPassword(service, key);
	}

	setItem(service: string, key: string, value: string): Promise<void> {
		return keytar.setPassword(service, key, value);
	}

	deleteItem(service: string, key: string): Promise<boolean> {
		return keytar.deletePassword(service, key);
	}
}
