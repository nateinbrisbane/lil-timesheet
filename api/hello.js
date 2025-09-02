// Simple test endpoint for Vercel
export default function handler(req, res) {
  res.status(200).json({ 
    message: 'Lil Timesheet API is working!',
    timestamp: new Date().toISOString()
  });
}