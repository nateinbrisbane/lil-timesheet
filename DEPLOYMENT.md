# Deployment Guide for Lil Timesheet

## Prerequisites

1. **Google Cloud Console Setup**:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select an existing one
   - Enable the Google+ API
   - Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client IDs"
   - Set application type to "Web application"
   - Add authorized JavaScript origins: `https://your-domain.com`
   - Add authorized redirect URIs: `https://your-domain.com/auth/google/callback`
   - Save the Client ID and Client Secret

2. **Environment Variables**:
   Copy `.env.example` to `.env` and fill in the values:
   ```bash
   GOOGLE_CLIENT_ID=your_google_client_id_here
   GOOGLE_CLIENT_SECRET=your_google_client_secret_here
   SESSION_SECRET=your_long_random_session_secret
   NODE_ENV=production
   PORT=3000
   BASE_URL=https://your-domain.com
   ```

## Deployment Options

### Option 1: Railway (Recommended)

1. **Prepare for Railway**:
   ```bash
   # Install Railway CLI
   npm install -g @railway/cli
   
   # Login to Railway
   railway login
   ```

2. **Deploy**:
   ```bash
   # Initialize Railway project
   railway init
   
   # Add environment variables in Railway dashboard
   # or use CLI:
   railway variables set GOOGLE_CLIENT_ID=your_client_id
   railway variables set GOOGLE_CLIENT_SECRET=your_client_secret
   railway variables set SESSION_SECRET=your_session_secret
   railway variables set NODE_ENV=production
   railway variables set BASE_URL=https://your-app-name.railway.app
   
   # Deploy
   railway up
   ```

### Option 2: Render

1. **Connect GitHub**:
   - Push your code to GitHub
   - Connect your GitHub repo to Render
   
2. **Configure**:
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Add environment variables in Render dashboard
   
### Option 3: Vercel (with external database)

1. **Deploy**:
   ```bash
   npm install -g vercel
   vercel
   ```
   
2. **Note**: Vercel's serverless environment doesn't support SQLite files. You'll need to migrate to a hosted database like PostgreSQL or MySQL.

### Option 4: Heroku

1. **Prepare**:
   ```bash
   # Install Heroku CLI
   # Create Procfile
   echo "web: npm start" > Procfile
   
   # Login and create app
   heroku login
   heroku create your-app-name
   
   # Add environment variables
   heroku config:set GOOGLE_CLIENT_ID=your_client_id
   heroku config:set GOOGLE_CLIENT_SECRET=your_client_secret
   heroku config:set SESSION_SECRET=your_session_secret
   heroku config:set NODE_ENV=production
   heroku config:set BASE_URL=https://your-app-name.herokuapp.com
   
   # Deploy
   git push heroku main
   ```

## Post-Deployment Steps

1. **Update Google OAuth Settings**:
   - Go back to Google Cloud Console
   - Update authorized JavaScript origins and redirect URIs with your production domain
   
2. **Test the Application**:
   - Visit your deployed URL
   - Test login with Google
   - Create a timesheet and verify data persistence
   - Test logout functionality
   
3. **Monitor**:
   - Check logs for any errors
   - Monitor database file size (SQLite)
   - Set up backups if needed

## Database Considerations

- **SQLite**: Good for small to medium applications, files are stored locally
- **Scaling**: For high traffic, consider migrating to PostgreSQL or MySQL
- **Backups**: Regularly backup your `timesheet.db` file

## Security Notes

- Never commit `.env` files to version control
- Use strong, unique session secrets
- Enable HTTPS in production
- Keep dependencies updated
- Monitor for security vulnerabilities

## Troubleshooting

1. **Authentication Issues**:
   - Verify Google OAuth URLs match your domain
   - Check environment variables are set correctly
   - Ensure BASE_URL includes protocol (https://)

2. **Database Issues**:
   - Check write permissions for SQLite file
   - Verify database file exists and is accessible

3. **Session Issues**:
   - Ensure SESSION_SECRET is set
   - Check cookie settings for HTTPS

## Monitoring & Maintenance

- Set up logging and monitoring
- Regular database backups
- Monitor disk space (for SQLite)
- Update dependencies regularly
- Monitor for security vulnerabilities