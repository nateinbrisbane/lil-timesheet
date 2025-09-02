// Simple test endpoint
export default function handler(req, res) {
    res.status(200).json({ 
        message: 'API routing is working!',
        timestamp: new Date().toISOString(),
        url: req.url,
        method: req.method
    });
}