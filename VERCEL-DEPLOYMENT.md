# Vercel Deployment Guide for Lil Timesheet

## Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **Google Cloud Console Access**: For OAuth credentials
3. **GitHub Repository**: Your code should be in a GitHub repository

## Step 1: Prepare Google OAuth for Production

1. **Go to Google Cloud Console**:
   - Visit [console.cloud.google.com](https://console.cloud.google.com)
   - Select your project or create a new one

2. **Enable APIs**:
   - Go to "APIs & Services" → "Library"
   - Search and enable "Google+ API"

3. **Create OAuth Credentials**:
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth 2.0 Client IDs"
   - Select "Web application"
   - Add these URIs (replace `your-app-name` with your actual Vercel app name):
     - **Authorized JavaScript origins**: 
       - `https://your-app-name.vercel.app`
     - **Authorized redirect URIs**: 
       - `https://your-app-name.vercel.app/auth/google/callback`

4. **Save Credentials**:
   - Copy the Client ID and Client Secret
   - You'll need these for Vercel environment variables

## Step 2: Deploy to Vercel

### Option A: Deploy via Vercel Dashboard (Recommended)

1. **Push to GitHub**:
   ```bash
   git add .
   git commit -m "Prepare for Vercel deployment"
   git push origin main
   ```

2. **Connect to Vercel**:
   - Go to [vercel.com/dashboard](https://vercel.com/dashboard)
   - Click "New Project"
   - Import your GitHub repository
   - Vercel will auto-detect it's a Node.js project

3. **Configure Environment Variables**:
   - In the deployment configuration, add these environment variables:
   ```
   GOOGLE_CLIENT_ID=your_google_client_id_here
   GOOGLE_CLIENT_SECRET=your_google_client_secret_here  
   SESSION_SECRET=your_random_long_session_secret_here
   NODE_ENV=production
   BASE_URL=https://your-app-name.vercel.app
   ```
   
   **Important**: Generate a strong session secret:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

4. **Deploy**:
   - Click "Deploy"
   - Wait for deployment to complete

### Option B: Deploy via CLI

1. **Install Vercel CLI**:
   ```bash
   npm install -g vercel
   ```

2. **Login**:
   ```bash
   vercel login
   ```

3. **Deploy**:
   ```bash
   vercel
   ```
   - Follow the prompts
   - Set environment variables when prompted

## Step 3: Set up Vercel Postgres Database

1. **Add Postgres to Your Project**:
   - Go to your project dashboard in Vercel
   - Click "Storage" tab
   - Click "Create Database"
   - Select "Postgres"
   - Choose a region close to your users
   - Click "Create"

2. **Environment Variables**:
   - Vercel automatically adds these environment variables:
     - `POSTGRES_URL`
     - `POSTGRES_PRISMA_URL`
     - `POSTGRES_URL_NON_POOLING`
     - `POSTGRES_USER`
     - `POSTGRES_HOST`
     - `POSTGRES_PASSWORD`
     - `POSTGRES_DATABASE`

   The app will automatically use these for database connection.

## Step 4: Final Configuration

1. **Update Google OAuth URLs**:
   - Go back to Google Cloud Console
   - Update your OAuth credentials with your actual Vercel URL:
     - Replace `your-app-name` with your actual Vercel project name
     - Example: `https://lil-timesheet.vercel.app`

2. **Update Environment Variables**:
   - In Vercel dashboard, go to Settings → Environment Variables
   - Update `BASE_URL` with your actual Vercel URL

3. **Redeploy** (if needed):
   - Vercel auto-deploys on every push to main branch
   - Or manually redeploy from dashboard

## Step 5: Test Your Deployment

1. **Visit Your App**:
   - Go to `https://your-app-name.vercel.app`
   - You should see the login page

2. **Test Authentication**:
   - Click "Sign in with Google"
   - Complete OAuth flow
   - Verify you're redirected back to the app

3. **Test Functionality**:
   - Create a timesheet entry
   - Save it and verify data persistence
   - Navigate between weeks
   - Test logout

## Environment Variables Reference

Add these in Vercel Dashboard → Settings → Environment Variables:

```
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here  
SESSION_SECRET=your_random_long_session_secret_here
NODE_ENV=production
BASE_URL=https://your-app-name.vercel.app
```

## Troubleshooting

### Common Issues:

1. **OAuth Redirect Mismatch**:
   - Ensure Google OAuth URLs exactly match your Vercel domain
   - Check for typos in redirect URIs

2. **Database Connection Issues**:
   - Verify Postgres database is created in Vercel
   - Check that environment variables are properly set

3. **Session Issues**:
   - Ensure SESSION_SECRET is set and is a long random string
   - Verify cookies work with HTTPS

4. **CORS Issues**:
   - Check BASE_URL matches your Vercel domain exactly
   - Ensure HTTPS is used (not HTTP)

### Debugging:

1. **Check Logs**:
   - Go to Vercel Dashboard → Functions tab
   - Click on a function to see logs

2. **Local Testing**:
   ```bash
   # Install dependencies including Vercel Postgres
   npm install
   
   # Test locally (uses SQLite)
   npm run dev
   ```

## Custom Domain (Optional)

1. **Add Custom Domain**:
   - In Vercel Dashboard → Settings → Domains
   - Add your custom domain
   - Update Google OAuth URLs accordingly
   - Update BASE_URL environment variable

## Security Checklist

- ✅ HTTPS enforced automatically by Vercel  
- ✅ Environment variables are encrypted
- ✅ Database credentials managed by Vercel
- ✅ Session secrets are strong and random
- ✅ Google OAuth properly configured
- ✅ No sensitive data in code repository

## Monitoring

- **Vercel Analytics**: Automatically available in dashboard
- **Error Tracking**: Check Function logs for errors
- **Performance**: Monitor in Vercel dashboard
- **Database Usage**: Check Postgres usage in Storage tab

Your Lil Timesheet app is now live and ready for multiple users! 🎉