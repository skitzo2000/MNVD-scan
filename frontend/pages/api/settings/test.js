// API route for testing settings - proxies to backend
export default async function handler(req, res) {
  const backendUrl = process.env.BACKEND_URL || 'http://backend:3000';
  
  try {
    const response = await fetch(`${backendUrl}/api/settings/test`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body),
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('Error proxying to backend:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
