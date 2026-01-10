# Vercel Configuration Guide for Bookify

## Required Environment Variables

Go to your Vercel project dashboard → Settings → Environment Variables and add:

### 1. MONGODB_URI
- **Name**: `MONGODB_URI`
- **Value**: `mongodb+srv://rajpatel:HpReE24BZtapObk8@cluster0.hpw6hlv.mongodb.net/bookify?retryWrites=true&w=majority`
- **Environment**: Production, Preview, Development (select all)

### 2. SESSION_SECRET
- **Name**: `SESSION_SECRET`
- **Value**: Generate a random string (e.g., use: `openssl rand -base64 32`)
- **Environment**: Production, Preview, Development (select all)

### 3. NODE_ENV (Optional but recommended)
- **Name**: `NODE_ENV`
- **Value**: `production`
- **Environment**: Production only

## Important Vercel Settings

### 1. Check Function Logs
- Go to your project → Deployments → Click on latest deployment → Functions tab
- Check for any errors related to MongoDB connection or session storage

### 2. Verify Domain Settings
- Go to Settings → Domains
- Make sure your domain is properly configured
- Ensure HTTPS is enabled (Vercel enables this by default)

### 3. Check Build Settings
- Go to Settings → General
- Verify that the build command and output directory are correct
- Root Directory should be: `Table_Booking` (if your project is in a subfolder)

## Troubleshooting Session Issues

### If redirects don't work:

1. **Check Vercel Function Logs**:
   - Look for "Session saved successfully" messages
   - Check for any MongoDB connection errors
   - Verify session store is initialized

2. **Verify Cookies are Being Set**:
   - Open browser DevTools → Application → Cookies
   - Check if `connect.sid` cookie is present
   - Verify cookie domain matches your Vercel domain

3. **Test Session Endpoint**:
   - After login, visit: `https://your-domain.vercel.app/check-auth`
   - Should return: `{"isLoggedIn":true,"user":{...}}`

## Common Issues

### Issue: Sessions not persisting
**Solution**: Make sure `MONGODB_URI` is set in Vercel environment variables

### Issue: Cookies not being set
**Solution**: 
- Check that `SESSION_SECRET` is set
- Verify domain in Vercel matches cookie domain
- Check browser console for cookie errors

### Issue: Redirects to login page
**Solution**: 
- Session might not be saved properly
- Check Vercel logs for session save errors
- Verify MongoDB session store is initialized

## Testing Steps

1. Set all environment variables in Vercel
2. Redeploy the project
3. Test signup - should redirect to home page
4. Test login - should redirect to home page
5. Check browser cookies - should see `connect.sid`
6. Check Vercel logs - should see session creation messages

