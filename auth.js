const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

function setupAuth(db) {
    passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: `${process.env.BASE_URL}/auth/google/callback`
    }, async (accessToken, refreshToken, profile, done) => {
        try {
            const user = await db.createOrUpdateUser(profile);
            return done(null, user);
        } catch (error) {
            console.error('Error in Google strategy:', error);
            return done(error, null);
        }
    }));

    passport.serializeUser((user, done) => {
        done(null, user.id);
    });

    passport.deserializeUser(async (id, done) => {
        try {
            const user = await db.getUserById(id);
            done(null, user);
        } catch (error) {
            console.error('Error deserializing user:', error);
            done(error, null);
        }
    });
}

function requireAuth(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    
    if (req.path.startsWith('/api/')) {
        return res.status(401).json({
            success: false,
            error: 'Authentication required',
            redirectTo: '/auth/google'
        });
    }
    
    res.redirect('/login');
}

function requireAuthAPI(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    
    return res.status(401).json({
        success: false,
        error: 'Authentication required',
        redirectTo: '/auth/google'
    });
}

module.exports = {
    setupAuth,
    requireAuth,
    requireAuthAPI
};