import 'dotenv/config';

const IS_DEV = process.env.NODE_ENV === 'development';
const OVERRIDE_UI = process.env.OVERRIDE_UI;
const OVERRIDE_INSTANCE_PATH = process.env.OVERRIDE_INSTANCE_PATH;

export { IS_DEV, OVERRIDE_UI, OVERRIDE_INSTANCE_PATH };
