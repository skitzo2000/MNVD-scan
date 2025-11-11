// API route for CVEs for a specific query - proxies to backend
export default async function handler(req, res) {
  const backendUrl = process.env.BACKEND_URL || 'http://backend:3000';
  const { id } = req.query;
  
  try {
    const response = await fetch(`${backendUrl}/api/queries/${id}/cves`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('Error proxying to backend:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
