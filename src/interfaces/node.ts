import { app } from 'electron';
import { ChildProcess, Serializable, fork, spawn } from 'child_process';
import { resolve as importMetaResolve } from 'import-meta-resolve';
import EventEmitter from 'events';

import { logger } from '../logger.js';
import Desktop from '../app/index.js';
import createDefer, { Deferred } from '../helpers/deferred.js';

// TODO: Define the RPC api
export type NodeRPCMessage = Record<string, any> & {
	type: string;
};

type EventMap = {
	message: [NodeRPCMessage];
	started: [];
	stopped: [];
	listenerChange: [boolean];
	error: [Error];
};

function isJsonMessage(message: Serializable): message is NodeRPCMessage {
	if (
		typeof message === 'object' &&
		message !== null &&
		Object.hasOwn(message, 'type')
	)
		return true;
	return false;
}

export default class Node extends EventEmitter<EventMap> {
	log = logger.extend('Node');
	started = false;
	listening = false;

	config: Desktop['config'];
	process: ChildProcess | null = null;

	constructor(config: Desktop['config']) {
		super();

		this.config = config;
	}

	startPromise?: Deferred<void>;
	start(): Promise<void> {
		if (this.started) return Promise.resolve();
		if (this.startPromise) return this.startPromise;

		this.log('Starting');
		this.started = true;

		const instancePath = importMetaResolve(
			'@satellite-earth/private-node',
			import.meta.url,
		).replace('file://', '');

		this.startPromise = createDefer<void>();

		// Start the local relay database on another thread
		this.process = fork(instancePath, [], {
			env: {
				PORT: String(this.config.nodePort),
				AUTH: this.config.auth,
				DATA_PATH: app.getPath('userData'),
				USE_PREBUILT_SQLITE_BINDINGS: 'true',
				// pass logging env
				DEBUG: process.env.DEBUG,
				DEBUG_COLORS: process.env.DEBUG_COLORS,
			},
		});

		// Listen for messages broadcast by the child
		// process so tray ui can reflect node status
		this.process.on('message', (message) => {
			if (isJsonMessage(message)) {
				switch (message.type) {
					case 'RELAY_READY':
						this.startPromise?.resolve();
						this.startPromise = undefined;
						break;
					case 'LISTENER_STATE':
						this.listening = message.data.listening;
						this.emit('listenerChange', this.listening);
						break;
				}

				this.emit('message', message);
			}
		});

		this.process.on('error', (err) => {
			this.emit('error', err);
		});

		// If the child process stops earlier than expected,
		// revert started status to avoid sending an IPC
		// to the stopped process and crashing the app
		this.process.on('disconnect', () => {
			if (this.startPromise) {
				this.startPromise.reject();
				this.startPromise = undefined;
			}

			this.log('Child process disconnected');
			this.started = false;
			this.listening = false;
			this.emit('listenerChange', this.listening);

			this.emit('stopped');
			this.emit('message', { type: 'STOPPED' });
		});

		this.emit('started');
		this.emit('message', { type: 'STARTED' });

		return this.startPromise;
	}

	stop() {
		if (this.process) {
			this.log('Stopping');
			this.process.kill('SIGINT');
			this.process = null;
		}
	}

	sendIpc(action: any, data: any) {
		if (!this.process) return;

		try {
			this.process.send([action, data]);
		} catch (err) {
			this.log(err);
		}
	}
}
