import debug from 'debug';

if (!process.env.DEBUG) debug.enable('satellite,satellite:*');

export const logger = debug('satellite');
