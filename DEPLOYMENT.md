# OPTECH ERP - Deployment Guide

## Step 1: GitHub Setup

1. **Create GitHub Repository**
   - Go to https://github.com/new
   - Repository name: `optech-erp`
   - Description: `OPTECH ERP System - Complete Business Management`
   - Make it **Public** (required for free hosting)
   - Click "Create repository"

2. **Push Your Code**
   ```bash
   # Replace YOUR_USERNAME with your actual GitHub username
   git remote add origin https://github.com/YOUR_USERNAME/optech-erp.git
   git branch -M main
   git push -u origin main
   ```

## Step 2: Render.com Deployment

1. **Sign Up for Render**
   - Go to https://render.com
   - Click "Sign Up" and use your GitHub account
   - Verify your email

2. **Create New Web Service**
   - Click "New +" button
   - Select "Web Service"
   - Connect your GitHub account
   - Choose the `optech-erp` repository
   - Click "Connect"

3. **Configure Deployment Settings**

   **Basic Settings:**
   - Name: `optech-erp`
   - Region: Choose nearest to your users
   - Branch: `main`

   **Environment:**
   - Runtime: `Node`
   - Build Command: `npm install`
   - Start Command: `node server.js`

   **Advanced Settings:**
   - Instance Type: `Free` (750 hours/month)
   - Auto-Deploy: `Yes` (updates automatically when you push to GitHub)

4. **Environment Variables (if needed)**
   - PORT: `3000` (Render sets this automatically)
   - NODE_ENV: `production`

5. **Click "Create Web Service"**

## Step 3: Wait for Deployment

- Render will automatically:
  - Install dependencies
  - Build your application
  - Start the server
  - Provide a public URL

- Deployment takes 2-5 minutes
- You'll see logs in the Render dashboard

## Step 4: Access Your Application

Once deployed, your app will be available at:
`https://optech-erp.onrender.com`

**Test the deployment:**
1. Open the URL in your browser
2. Try logging in with: `admin / 1234`
3. Test all features (create users, activities, etc.)

## Step 5: Custom Domain (Optional)

1. **Get a Free Domain**
   - Go to https://freenom.com
   - Search for available domains (.tk, .ml, .ga, .cf)
   - Register for free (12 months)

2. **Configure Custom Domain in Render**
   - Go to your Web Service settings
   - Click "Custom Domains"
   - Add your domain (e.g., `your-domain.tk`)
   - Render will provide DNS records

3. **Update DNS at Freenom**
   - Go to your Freenom dashboard
   - Click "Manage Domain"
   - Add the DNS records provided by Render
   - Wait 1-24 hours for propagation

## Troubleshooting

### Common Issues:

**Build Failed:**
- Check package.json has correct dependencies
- Ensure server.js exists and is valid

**Deployment Failed:**
- Check Render logs for specific errors
- Make sure your repository is public

**Can't Access API:**
- Ensure CORS headers are in server.js (already added)
- Check if the app is running on correct port

**Database Issues:**
- db.json should be in the repository
- File permissions should allow read/write

### Important Notes:

1. **Free Tier Limitations:**
   - App sleeps after 15 minutes of inactivity
   - Takes ~30 seconds to wake up
   - 750 hours/month (enough for continuous use)

2. **Data Persistence:**
   - Your db.json file persists between deployments
   - Back up your data regularly

3. **Security:**
   - Change default admin password after first login
   - Use HTTPS (Render provides this automatically)

## Alternative Hosting Options

If Render doesn't work, try:

1. **Vercel** (Free)
   - Similar setup process
   - Good Node.js support

2. **Railway** ($5/month after credits)
   - More reliable than free tiers
   - Better performance

3. **DigitalOcean** ($4-6/month)
   - Full VPS control
   - Install Node.js manually

## Next Steps

After successful deployment:

1. Test all features thoroughly
2. Change default admin password
3. Set up regular backups
4. Consider upgrading to paid plan for better performance
5. Add your own branding/customization

---

**Need Help?**
- Check Render documentation: https://render.com/docs
- Review deployment logs in Render dashboard
- Email: support@render.com
