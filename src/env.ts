import 'dotenv/config';

const IS_DEV = process.env.NODE_ENV === 'development';
const OVERRIDE_UI = process.env.OVERRIDE_UI;

export { IS_DEV, OVERRIDE_UI };
