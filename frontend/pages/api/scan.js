import { createProxyHandler } from '../../lib/apiProxy';

export default createProxyHandler('/api/scan', { method: 'POST' });
