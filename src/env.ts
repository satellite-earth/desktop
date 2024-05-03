import 'dotenv/config';

const IS_DEV = process.env.NODE_ENV === 'development';
const OVERRIDE_DASHBOARD_UI = process.env.OVERRIDE_DASHBOARD_UI;
const OVERRIDE_COMMUNITY_UI = process.env.OVERRIDE_COMMUNITY_UI;

export { IS_DEV, OVERRIDE_DASHBOARD_UI, OVERRIDE_COMMUNITY_UI };
