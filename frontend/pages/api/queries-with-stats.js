import { createProxyHandler } from '../../lib/apiProxy';

export default createProxyHandler('/api/queries-with-stats', { method: 'GET' });
