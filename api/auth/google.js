// Vercel serverless function for Google OAuth
import { setupAuth } from '../../auth.js';
import Database from '../../database-vercel.js';

const db = new Database();

export default async function handler(req, res) {
    try {
        // Initialize auth for this request
        await setupAuth(db);
        
        // Redirect to Google OAuth
        const googleAuthUrl = `https://accounts.google.com/oauth/authorize?${new URLSearchParams({
            client_id: process.env.GOOGLE_CLIENT_ID,
            redirect_uri: `${process.env.BASE_URL}/api/auth/google/callback`,
            response_type: 'code',
            scope: 'profile email',
            access_type: 'offline',
            prompt: 'consent'
        })}`;
        
        res.redirect(googleAuthUrl);
    } catch (error) {
        console.error('OAuth initiation error:', error);
        res.status(500).json({ error: 'Authentication initialization failed' });
    }
}