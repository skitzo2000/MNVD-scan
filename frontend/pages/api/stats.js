import { createProxyHandler } from '../../lib/apiProxy';

export default createProxyHandler('/api/stats', { method: 'GET' });
