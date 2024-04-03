const IS_DEV =
	process.env.NODE_ENV === 'dev' || process.env.NODE_ENV !== 'production';
const OVERRIDE_UI = process.env.OVERRIDE_UI;

export { IS_DEV, OVERRIDE_UI };
