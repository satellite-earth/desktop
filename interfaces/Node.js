import { app } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { fork } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/* Interact with with local relay */
export default class Node {
	constructor(config = {}, event) {
		this.config = config;
		this.event = event;

		this.started = false;
		this.listening = false;
	}

	start() {
		if (this.started) {
			console.log('Did not start relay - process already started');
			return;
		}

		this.started = true;

		const instancePath =
			process.env.NODE_ENV === 'dev'
				? path.join(__dirname, '../../private-node/dist/index.js')
				: path.join(process.resourcesPath, 'private-node/dist/index.js');

		const bindingsPath =
			process.env.NODE_ENV === 'dev'
				? path.join(__dirname, '../bindings')
				: path.join(process.resourcesPath, 'bindings');

		// Start the local relay database on another thread
		this.process = fork(instancePath, [], {
			env: {
				DATA_PATH: app.getPath('userData'),
				NATIVE_BINDINGS_PATH: bindingsPath,
				...this.config,
			},
		});

		// Listen for messages broadcast by the child
		// process so tray ui can reflect node status
		this.process.on('message', (message) => {
			if (message.type === 'LISTENER_STATE') {
				this.listening = message.data.listening;
			}

			this.event(message);
		});

		// If the child process stops earlier than expected,
		// revert started status to avoid sending an IPC
		// to the stopped process and crashing the app
		this.process.on('disconnect', () => {
			console.log('Child process disconnected');
			this.started = false;
			this.listening = false;
			this.event({ type: 'STOPPED' });
		});

		this.event({ type: 'STARTED' });
	}

	stop(params) {
		if (!this.process) {
			console.log('Did not stop relay - process does not exist');
			return;
		}

		this.process.kill('SIGINT');

		// If the process does not appear to have reported,
		// started, just kill the process with SIGINT
		// if (/*!this.started*/true) {
		// 	console.log('calling sigint...');
		// 	this.process.kill('SIGINT');
		// 	//return;
		// }

		// this.started = false;
		// this.listening = false;

		// this.sendIpc('STOP', params);
		//this.event({ type: 'STOPPED' });
	}

	sendIpc(action, data) {
		if (!this.process) {
			return;
		}

		try {
			this.process.send([action, data]);
		} catch (err) {
			console.log(err);
		}
	}
}
