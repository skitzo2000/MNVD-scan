import { createDynamicProxyHandler } from '../../../../lib/apiProxy';

export default createDynamicProxyHandler(
  ({ id }) => `/api/queries/${id}/cves`,
  { method: 'GET' }
);
