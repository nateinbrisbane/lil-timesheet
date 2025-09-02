require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const session = require('express-session');
const passport = require('passport');
const { v4: uuidv4 } = require('uuid');

// Use Vercel Postgres in production (Vercel), SQLite in development
const Database = process.env.VERCEL 
    ? require('./database-vercel') 
    : require('./database');
const { setupAuth, requireAuth, requireAuthAPI } = require('./auth');

const app = express();
const PORT = process.env.PORT || 3000;
const db = new Database();

app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
        ? process.env.BASE_URL 
        : ['http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true
}));

app.use(express.json());

app.use(session({
    secret: process.env.SESSION_SECRET || 'your-fallback-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

app.use(passport.initialize());
app.use(passport.session());

async function initializeDatabase() {
    try {
        console.log('Initializing database...');
        await db.connect();
        console.log('Database connected successfully');
        
        // Initialize auth AFTER database connection
        console.log('Setting up authentication...');
        setupAuth(db);
        console.log('Authentication setup completed');
        
        console.log('Database and authentication initialized successfully');
    } catch (error) {
        console.error('Failed to initialize database:', error);
        console.error('Error details:', error.message);
        // Don't exit in serverless - let it retry
        throw error;
    }
}

// Auth routes
app.get('/auth/google', async (req, res, next) => {
    console.log('OAuth request initiated');
    console.log('Environment check in auth route:');
    console.log('GOOGLE_CLIENT_ID exists:', !!process.env.GOOGLE_CLIENT_ID);
    console.log('BASE_URL:', process.env.BASE_URL);
    
    try {
        // Ensure database is initialized before OAuth
        if (!db.db && process.env.VERCEL) {
            console.log('Database not initialized, initializing now...');
            await initializeDatabase();
        }
        
        console.log('Google strategy available:', !!passport._strategies?.google);
        
        passport.authenticate('google', {
            scope: ['profile', 'email']
        })(req, res, next);
    } catch (error) {
        console.error('Error in /auth/google route:', error);
        res.status(500).json({
            error: 'OAuth initialization failed',
            message: error.message,
            details: 'Check server logs for more information'
        });
    }
});

app.get('/auth/google/callback', 
    passport.authenticate('google', { failureRedirect: '/login' }),
    (req, res) => {
        res.redirect('/');
    }
);

app.post('/auth/logout', (req, res) => {
    req.logout((err) => {
        if (err) {
            return res.status(500).json({
                success: false,
                error: 'Logout failed'
            });
        }
        
        req.session.destroy((err) => {
            if (err) {
                return res.status(500).json({
                    success: false,
                    error: 'Session destruction failed'
                });
            }
            
            res.json({
                success: true,
                message: 'Logged out successfully'
            });
        });
    });
});

// Debug endpoints (public - MUST come before auth middleware)
app.get('/api/test', (req, res) => {
    res.status(200).json({ 
        message: 'API routing is working!',
        timestamp: new Date().toISOString(),
        url: req.url,
        method: req.method
    });
});

app.get('/api/auth-test', (req, res) => {
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
});

app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        database: db.db ? 'Connected' : 'Disconnected',
        authenticated: req.isAuthenticated() ? 'Yes' : 'No'
    });
});

app.get('/api/debug-env', (req, res) => {
    res.json({
        hasGoogleClientId: !!process.env.GOOGLE_CLIENT_ID,
        hasGoogleClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
        baseUrl: process.env.BASE_URL,
        nodeEnv: process.env.NODE_ENV,
        isVercel: !!process.env.VERCEL,
        googleClientIdLength: process.env.GOOGLE_CLIENT_ID ? process.env.GOOGLE_CLIENT_ID.length : 0
    });
});

app.get('/api/debug-init', (req, res) => {
    res.json({
        databaseConnected: !!db.db,
        passportStrategies: Object.keys(passport._strategies || {}),
        hasGoogleStrategy: !!passport._strategies?.google,
        dbType: db.constructor.name
    });
});

app.get('/api/force-auth-setup', async (req, res) => {
    try {
        console.log('Manual auth setup requested');
        
        // Check if database is connected
        if (!db.db) {
            console.log('Database not connected, connecting...');
            await db.connect();
        }
        
        // Force setup auth
        console.log('Forcing auth setup...');
        setupAuth(db);
        
        // Check results
        const result = {
            success: true,
            databaseConnected: !!db.db,
            passportStrategies: Object.keys(passport._strategies || {}),
            hasGoogleStrategy: !!passport._strategies?.google,
            dbType: db.constructor.name,
            message: 'Auth setup completed'
        };
        
        console.log('Force auth setup result:', result);
        res.json(result);
        
    } catch (error) {
        console.error('Error in force auth setup:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            stack: error.stack,
            message: 'Auth setup failed'
        });
    }
});

// User info route
app.get('/api/user', requireAuthAPI, (req, res) => {
    const { id, google_id, email, name, profile_picture } = req.user;
    res.json({
        success: true,
        user: {
            id,
            googleId: google_id,
            email,
            name,
            profilePicture: profile_picture
        }
    });
});

// Login page route (MUST come before auth middleware)
app.get('/login', (req, res) => {
    if (req.isAuthenticated()) {
        return res.redirect('/');
    }
    res.sendFile(path.join(__dirname, 'login.html'));
});

// Static files (only serve to authenticated users for main app)
app.use('/', requireAuth, express.static('.'));

// Main app route
app.get('/', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// API routes (all require authentication)
app.post('/api/timesheet', requireAuthAPI, async (req, res) => {
    try {
        const weekData = req.body;
        const userId = req.user.id;
        
        if (!weekData.weekStart || !weekData.data) {
            return res.status(400).json({ 
                error: 'Missing required fields: weekStart and data' 
            });
        }

        const result = await db.saveTimesheet(userId, weekData);
        
        res.status(201).json({
            success: true,
            message: 'Timesheet saved successfully',
            data: result
        });
    } catch (error) {
        console.error('Error saving timesheet:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to save timesheet',
            message: error.message
        });
    }
});

app.get('/api/timesheet/:weekStart', requireAuthAPI, async (req, res) => {
    try {
        const { weekStart } = req.params;
        const userId = req.user.id;
        const timesheet = await db.getTimesheet(userId, weekStart);
        
        if (!timesheet) {
            return res.status(404).json({
                success: false,
                error: 'Timesheet not found'
            });
        }

        res.json({
            success: true,
            data: timesheet
        });
    } catch (error) {
        console.error('Error fetching timesheet:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch timesheet',
            message: error.message
        });
    }
});

app.get('/api/timesheets', requireAuthAPI, async (req, res) => {
    try {
        const userId = req.user.id;
        const timesheets = await db.getAllTimesheets(userId);
        
        res.json({
            success: true,
            data: timesheets
        });
    } catch (error) {
        console.error('Error fetching timesheets:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch timesheets',
            message: error.message
        });
    }
});

app.delete('/api/timesheet/:weekStart', requireAuthAPI, async (req, res) => {
    try {
        const { weekStart } = req.params;
        const userId = req.user.id;
        
        const deleteQuery = 'DELETE FROM timesheets WHERE user_id = ? AND week_start = ?';
        
        db.db.run(deleteQuery, [userId, weekStart], function(err) {
            if (err) {
                console.error('Error deleting timesheet:', err);
                return res.status(500).json({
                    success: false,
                    error: 'Failed to delete timesheet',
                    message: err.message
                });
            }

            if (this.changes === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Timesheet not found'
                });
            }

            res.json({
                success: true,
                message: 'Timesheet deleted successfully'
            });
        });
    } catch (error) {
        console.error('Error deleting timesheet:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete timesheet',
            message: error.message
        });
    }
});


app.use((req, res) => {
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({
            success: false,
            error: 'Endpoint not found'
        });
    }
    res.status(404).send('Page not found');
});

app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    if (req.path.startsWith('/api/')) {
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: error.message
        });
    } else {
        res.status(500).send('Internal server error');
    }
});

process.on('SIGINT', async () => {
    console.log('\nReceived SIGINT, closing database connection...');
    try {
        await db.close();
        console.log('Database connection closed. Exiting...');
        process.exit(0);
    } catch (error) {
        console.error('Error closing database:', error);
        process.exit(1);
    }
});

async function startServer() {
    try {
        await initializeDatabase();
        
        app.listen(PORT, () => {
            console.log(`🚀 Lil Timesheet server running on ${process.env.BASE_URL || `http://localhost:${PORT}`}`);
            console.log(`📊 Database: SQLite (${path.join(__dirname, 'timesheet.db')})`);
            console.log('🔐 Authentication: Google OAuth 2.0');
            console.log('📡 API endpoints available:');
            console.log('  GET    /auth/google              - Login with Google');
            console.log('  POST   /auth/logout              - Logout');
            console.log('  GET    /api/user                 - Get current user');
            console.log('  GET    /api/timesheets           - List user timesheets');
            console.log('  GET    /api/timesheet/:weekStart - Get specific timesheet');
            console.log('  POST   /api/timesheet            - Save timesheet');
            console.log('  DELETE /api/timesheet/:weekStart - Delete timesheet');
            console.log('  GET    /api/health               - Health check');
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

// Initialize database connection for serverless
if (process.env.VERCEL) {
    // In Vercel, initialize on import
    initializeDatabase().catch(console.error);
} else if (require.main === module) {
    // In local development, start server normally
    startServer();
}

module.exports = app;