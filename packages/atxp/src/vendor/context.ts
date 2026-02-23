import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { getContext } = require('./context.cjs') as { getContext: () => Promise<string> };

export { getContext };
