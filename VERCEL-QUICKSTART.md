# Quick Vercel Deployment Checklist

## 🚀 Ready to Deploy? Follow these steps:

### 1. Google OAuth Setup (5 minutes)
- [ ] Go to [Google Cloud Console](https://console.cloud.google.com)
- [ ] Create OAuth 2.0 Client ID
- [ ] Add authorized origins: `https://your-app-name.vercel.app`
- [ ] Add redirect URI: `https://your-app-name.vercel.app/auth/google/callback`
- [ ] Copy Client ID and Client Secret

### 2. Push to GitHub (2 minutes)
```bash
git add .
git commit -m "Ready for Vercel deployment"
git push origin main
```

### 3. Deploy on Vercel (3 minutes)
- [ ] Go to [vercel.com/dashboard](https://vercel.com/dashboard)
- [ ] Click "New Project"
- [ ] Import your GitHub repository
- [ ] Add environment variables:
  ```
  GOOGLE_CLIENT_ID=your_client_id_here
  GOOGLE_CLIENT_SECRET=your_client_secret_here
  SESSION_SECRET=your_random_secret_here
  NODE_ENV=production
  BASE_URL=https://your-app-name.vercel.app
  ```
- [ ] Click "Deploy"

### 4. Add Database (2 minutes)
- [ ] In Vercel dashboard: Storage → Create Database → Postgres
- [ ] Wait for database to be created (automatic environment variables)

### 5. Update Google OAuth (1 minute)
- [ ] Go back to Google Cloud Console
- [ ] Update OAuth URLs with your actual Vercel URL
- [ ] Update `BASE_URL` in Vercel if needed

### 6. Test Your App ✅
- [ ] Visit your Vercel URL
- [ ] Sign in with Google
- [ ] Create and save a timesheet
- [ ] Test logout

## 🎉 You're Live!

Your multi-user timesheet application is now running on Vercel with:
- ✅ Google authentication
- ✅ Postgres database  
- ✅ HTTPS security
- ✅ Global CDN
- ✅ Automatic scaling

**Need help?** Check the detailed [VERCEL-DEPLOYMENT.md](VERCEL-DEPLOYMENT.md) guide.