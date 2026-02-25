/**
 * Shared API proxy handler for Next.js API routes.
 * Creates a handler that proxies requests to the backend.
 *
 * @param {string} path - Backend API path (e.g., '/api/queries')
 * @param {Object} [options] - Options
 * @param {string} [options.method] - Override HTTP method (defaults to req.method)
 * @returns {Function} Next.js API route handler
 */
export function createProxyHandler(path, options = {}) {
  return async (req, res) => {
    const backendUrl = process.env.BACKEND_URL || 'http://backend:3000';
    const method = options.method || req.method;

    try {
      const response = await fetch(`${backendUrl}${path}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: method !== 'GET' ? JSON.stringify(req.body) : undefined,
      });

      const data = await response.json();
      res.status(response.status).json(data);
    } catch (error) {
      console.error(`Error proxying to backend ${path}:`, error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
}

/**
 * Creates a proxy handler that resolves dynamic path segments from req.query.
 *
 * @param {Function} pathFn - Function that takes req.query and returns the backend path
 * @param {Object} [options] - Options
 * @returns {Function} Next.js API route handler
 */
export function createDynamicProxyHandler(pathFn, options = {}) {
  return async (req, res) => {
    const backendUrl = process.env.BACKEND_URL || 'http://backend:3000';
    const path = pathFn(req.query);
    const method = options.method || req.method;

    try {
      const response = await fetch(`${backendUrl}${path}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: method !== 'GET' ? JSON.stringify(req.body) : undefined,
      });

      const data = await response.json();
      res.status(response.status).json(data);
    } catch (error) {
      console.error(`Error proxying to backend ${path}:`, error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
}
