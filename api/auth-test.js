// Test Google OAuth redirect
export default function handler(req, res) {
    try {
        console.log('Environment check:');
        console.log('GOOGLE_CLIENT_ID exists:', !!process.env.GOOGLE_CLIENT_ID);
        console.log('BASE_URL:', process.env.BASE_URL);
        
        if (!process.env.GOOGLE_CLIENT_ID) {
            return res.status(500).json({ error: 'GOOGLE_CLIENT_ID not configured' });
        }
        
        // Manual Google OAuth URL construction
        const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams({
            client_id: process.env.GOOGLE_CLIENT_ID,
            redirect_uri: `${process.env.BASE_URL}/auth/google/callback`,
            response_type: 'code',
            scope: 'profile email',
            access_type: 'offline'
        })}`;
        
        console.log('Redirecting to:', googleAuthUrl);
        
        // Test redirect
        res.writeHead(302, {
            'Location': googleAuthUrl
        });
        res.end();
        
    } catch (error) {
        console.error('Auth test error:', error);
        res.status(500).json({ 
            error: 'Auth test failed',
            message: error.message,
            env: {
                hasClientId: !!process.env.GOOGLE_CLIENT_ID,
                hasBaseUrl: !!process.env.BASE_URL
            }
        });
    }
}