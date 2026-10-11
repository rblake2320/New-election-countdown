// Shared runner contract, including legacy invocations from this folder.
import config from '../../playwright.config';
export default { ...config, testDir: '..' };
