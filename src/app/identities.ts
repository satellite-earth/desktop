import { EventEmitter } from 'stream';
import Desktop from './index.js';

type IdentityItem = {
	pubkey: string;
	seckey: string;
	active: boolean;
};

// Manage identities
export default class IdentityManager {
	// TODO: emit event when active identity changes so
	// things that need to reload can listen for that

	protected KEYSTORE_NAME = 'SatelliteIdentity';
	desktop: Desktop;

	constructor(desktop: Desktop) {
		this.desktop = desktop;
	}

	listIdentities(): Promise<IdentityItem[]> {
		return new Promise((resolve) => {
			this.desktop.secretManager.listItems(this.KEYSTORE_NAME).then((items) => {
				resolve(
					items.map(({ key, value }) => {
						return {
							pubkey: key,
							seckey: value,
							active: key === this.desktop.config.activeIdentity,
						};
					}),
				);
			});
		});
	}

	getActive(): Promise<IdentityItem | null> {
		return new Promise((resolve) => {
			this.listIdentities().then((items) => {
				let active = null;
				for (let item of items) {
					if (item.active) {
						active = item;
						break;
					}
				}
				resolve(active);
			});
		});
	}

	setActive(pubkey: string): void {
		// TODO mark identity as active in this.desktop.config
	}

	newIdentity(label: string): void {
		// TODO generate new secret key, save in secrets and set active
	}

	addIdentity(seckey: string, label: string): void {
		// TODO validate secret key or nsec and save in secrets
		// TODO enforce uniqueness of labels and pubkeys
	}

	removeIdentity(pubkey: string): Promise<boolean> {
		// TODO if active, unmark as active in this.desktop.config
		return this.desktop.secretManager.deleteItem(this.KEYSTORE_NAME, pubkey);
	}
}
