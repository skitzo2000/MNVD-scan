// API route for settings - proxies to backend
export default async function handler(req, res) {
  const backendUrl = process.env.BACKEND_URL || 'http://backend:3000';
  
  try {
    const response = await fetch(`${backendUrl}/api/settings`, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined,
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('Error proxying to backend:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
