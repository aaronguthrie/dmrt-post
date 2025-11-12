# Setting Up Custom Domain: post.dmrt.ie

## Step-by-Step Instructions

### 1. Add Domain in Vercel Dashboard

1. Go to your Vercel project dashboard: https://vercel.com/dashboard
2. Click on your project (`dmrt-post`)
3. Go to **Settings** → **Domains**
4. Click **Add Domain**
5. Enter: `post.dmrt.ie`
6. Click **Add**

### 2. Configure DNS Records

Vercel will show you the DNS records you need to add. You have two options:

#### Option A: CNAME Record (Recommended)
- **Type**: CNAME
- **Name**: `post`
- **Value**: `cname.vercel-dns.com`
- **TTL**: Auto or 3600

#### Option B: A Record
- **Type**: A
- **Name**: `post`
- **Value**: `76.76.21.21` (Vercel will provide the exact IP)
- **TTL**: Auto or 3600

**Add this DNS record in your domain registrar (where dmrt.ie is registered)**

### 3. Wait for DNS Propagation

- DNS changes can take 5 minutes to 48 hours to propagate
- Vercel will show the status in the Domains section
- When it shows "Valid Configuration", you're done!

### 4. Set Environment Variable in Vercel

1. In Vercel dashboard, go to **Settings** → **Environment Variables**
2. Add or update:
   - **Key**: `NEXT_PUBLIC_APP_URL`
   - **Value**: `https://post.dmrt.ie`
   - **Environment**: Production (and Preview if you want)
3. Click **Save**

### 5. Redeploy (if needed)

After adding the environment variable:
1. Go to **Deployments** tab
2. Click the **⋯** menu on the latest deployment
3. Click **Redeploy**

Or simply push a new commit to trigger a new deployment.

### 6. Verify It's Working

1. Visit https://post.dmrt.ie
2. You should see the login page
3. Check that SSL certificate is valid (lock icon in browser)

## Troubleshooting

### Getting Vercel 404 Error (Domain resolves but shows 404)

This usually means the domain is routing to Vercel but isn't assigned to your project:

1. **Verify Domain Assignment**:
   - Go to Vercel Dashboard → Your Project → Settings → Domains
   - Check that `post.dmrt.ie` shows "Valid Configuration" (green checkmark)
   - If it shows "Invalid Configuration" or is missing, click "Add Domain" again

2. **Check Domain Status**:
   - The domain should show one of these statuses:
     - ✅ "Valid Configuration" - Working correctly
     - ⏳ "Pending" - DNS is propagating, wait a few minutes
     - ❌ "Invalid Configuration" - DNS records are wrong

3. **Redeploy After Adding Domain**:
   - After adding the domain in Vercel, trigger a new deployment:
     - Go to Deployments tab
     - Click "Redeploy" on the latest deployment
     - OR push a new commit to GitHub

4. **Verify Project Assignment**:
   - Make sure you're adding the domain to the correct project (`dmrt-post`)
   - If you have multiple projects, double-check you're in the right one

5. **Check DNS Records**:
   - Verify your DNS records match exactly what Vercel shows
   - CNAME should point to: `cname.vercel-dns.com`
   - Or A record should point to the IP Vercel provides

### Domain Not Resolving
- Check DNS records are correct in your registrar
- Use `dig post.dmrt.ie` or `nslookup post.dmrt.ie` to verify DNS
- Wait longer for DNS propagation

### SSL Certificate Issues
- Vercel automatically provisions SSL certificates via Let's Encrypt
- This happens automatically after DNS is configured
- Can take up to 24 hours for SSL to be issued

### Still Seeing Vercel Default Domain
- Clear your browser cache
- Check DNS propagation: https://www.whatsmydns.net/#CNAME/post.dmrt.ie
- Ensure environment variable `NEXT_PUBLIC_APP_URL` is set correctly

## Important Notes

- The app will work on both `post.dmrt.ie` AND the Vercel default domain (e.g., `dmrt-post.vercel.app`)
- All magic links in emails will use `https://post.dmrt.ie` once `NEXT_PUBLIC_APP_URL` is set
- The domain must be verified in Vercel before it will work

