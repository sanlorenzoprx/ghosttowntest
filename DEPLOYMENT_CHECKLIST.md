# LIT Ghost Town Test — Deployment Checklist

**Estimated Time:** 30-45 minutes  
**Difficulty:** Easy (all instructions provided)

---

## ✅ PRE-DEPLOYMENT (5 minutes)

- [ ] All files in `/home/claude/lit-ghosttown/` directory
- [ ] `npm install` run successfully
- [ ] No TypeScript errors (`npm run type-check`)
- [ ] `.env.example` exists
- [ ] `README.md` contains project overview

---

## ✅ GITHUB SETUP (5 minutes)

### Option A: Fresh Repository
```bash
cd lit-ghosttown

# Initialize git
git init

# Add remote
git remote add origin https://github.com/sanlorenzoprx/lit-ghosttown.git

# Create .gitignore (add if not present)
echo "node_modules/
dist/
.env
.env.local
.DS_Store" > .gitignore

# Push to GitHub
git add .
git commit -m "Initial commit: LIT Ghost Town Test MVP"
git branch -M main
git push -u origin main
```

### Option B: Existing Repository
```bash
cd lit-ghosttown
git add .
git commit -m "feat: add complete LIT Ghost Town Test MVP (40+ files)"
git push origin main
```

---

## ✅ CLOUDFLARE SETUP (10 minutes)

### 1. Create KV Namespaces
```bash
# Install Wrangler if not already installed
npm install -g wrangler

# Create production namespace
wrangler kv:namespace create lit-kv

# Create preview namespace
wrangler kv:namespace create lit-kv --preview

# Note the IDs (you'll need them in wrangler.toml)
```

### 2. Update wrangler.toml
```toml
# Replace the kv_namespaces section with:
[[kv_namespaces]]
binding = "KV"
id = "YOUR_PRODUCTION_ID"
preview_id = "YOUR_PREVIEW_ID"

# Example (get your actual IDs from wrangler output):
[[kv_namespaces]]
binding = "KV"
id = "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6"
preview_id = "z9y8x7w6v5u4t3s2r1q0p9o8n7m6l5k4"
```

### 3. Set Environment Variables
```bash
# Create .env.local for local development
echo 'VITE_API_URL=http://localhost:8787
STRIPE_PUBLIC_KEY=pk_test_YOUR_TEST_KEY' > .env.local
```

### 4. Add secrets securely
Use Wrangler secrets or the Cloudflare dashboard. Do not put secret values in `wrangler.toml`:
```bash
npx wrangler secret put JWT_SECRET --env production
npx wrangler secret put STRIPE_SECRET_KEY --env production
npx wrangler secret put STRIPE_WEBHOOK_SECRET --env production
npx wrangler secret put STRIPE_30_DAY_PLAN_PRICE_ID --env production
```

---

## ✅ STRIPE SETUP (10 minutes)

### 1. Get Stripe Credentials
1. Go to https://dashboard.stripe.com
2. Navigate to Developers → API Keys
3. Copy:
   - `pk_test_*` (Publishable Key)
   - `sk_test_*` (Secret Key)

### 2. Create Product & Price
```bash
# In Stripe Dashboard:
1. Products → Create Product
2. Name: "LIT Tests"
3. Description: "One-time personalized 30-day evidence plan delivered as PDF and canonical JSON"
4. Price: $97.00 USD, one time
5. Copy the price ID as `STRIPE_30_DAY_PLAN_PRICE_ID`

The existing 10-assessment credit product remains a separate $14.97 decline-path fallback and must not be used as the 30-day plan price.
```

### 3. Add to .env and wrangler.toml
```
STRIPE_PUBLIC_KEY=pk_test_YOUR_KEY
STRIPE_SECRET_KEY=sk_test_YOUR_KEY
STRIPE_PRICE_ID=price_YOUR_PRICE_ID
STRIPE_30_DAY_PLAN_PRICE_ID=price_YOUR_97_DOLLAR_PLAN_PRICE_ID
```

---

## ✅ LOCAL TESTING (10 minutes)

### Terminal 1: Frontend Dev Server
```bash
cd lit-ghosttown
npm run dev

# Runs on http://localhost:5173
```

### Terminal 2: Cloudflare Workers
```bash
cd lit-ghosttown
wrangler dev

# Runs on http://localhost:8787
```

### Test Flows
1. **Landing Page**
   - [ ] Hero section loads
   - [ ] "Test My Idea" button works
   - [ ] "Try Sample Idea" button works

2. **Anonymous Test**
   - [ ] IdeaIntake form submits
   - [ ] QuestionFlow starts
   - [ ] All 15 questions load
   - [ ] Answers are recorded
   - [ ] ResultReport displays verdict

3. **Verdict Generation**
   - [ ] Verdict displays (build_now, test_first, etc.)
   - [ ] Scores show (Ghost Town, LIT, Business DNA, etc.)
   - [ ] "Do not build until" shows guidance
   - [ ] "Recommended next test" shows action item

4. **Share Functionality**
   - [ ] Share text can be copied
   - [ ] Share text contains all key info

5. **Authentication**
   - [ ] Signup creates new account
   - [ ] Login with correct credentials works
   - [ ] Login with wrong credentials fails
   - [ ] Dashboard shows test counts

---

## ✅ DEPLOY TO CLOUDFLARE (10 minutes)

### Step 1: Build Frontend
```bash
npm run build

# Creates dist/ folder
```

### Step 2: Deploy to Cloudflare Pages
```bash
# Option A: Via Wrangler
wrangler pages deploy dist

# Option B: Via Cloudflare Dashboard
# 1. https://dash.cloudflare.com/
# 2. Pages → Create a project
# 3. Connect git repo
# 4. Set build command: npm run build
# 5. Set output directory: dist
```

### Step 3: Deploy API to Cloudflare Workers
```bash
wrangler publish

# This deploys src/api/index.ts to your Workers
```

### Step 4: Configure Domain (Optional)
```bash
# In Cloudflare Dashboard:
1. Go to your Pages project
2. Settings → Custom domains
3. Add your domain (e.g., lit.app)
```

---

## ✅ STRIPE WEBHOOK SETUP (5 minutes)

### 1. Get Your Worker URL
```bash
# From wrangler publish output, you'll get:
# https://lit-ghost-town-api.YOUR_ACCOUNT.workers.dev
```

### 2. Add Webhook in Stripe Dashboard
1. Go to Developers → Webhooks
2. Click "Add an endpoint"
3. URL: `https://your-worker-url/api/webhook/stripe`
4. Events to send:
   - `checkout.session.completed`
   - `payment_intent.payment_failed`
5. Copy the signing secret: `whsec_*`
6. Add to wrangler.toml: `STRIPE_WEBHOOK_SECRET`

### 3. Test Webhook (in Stripe Dashboard)
- Click your webhook
- "Send test event" → Should return 200 OK

---

## ✅ LIVE TESTING (5 minutes)

### Test the Deployment
```bash
# Visit your deployed URL:
https://lit-ghosttown.pages.dev/

# Or your custom domain:
https://lit.app/

# Test flows:
1. [ ] Landing page loads
2. [ ] Test anonymous idea
3. [ ] Signup and login
4. [ ] Try Stripe checkout (test card: 4242 4242 4242 4242)
5. [ ] Check Stripe logs for webhook
6. [ ] Verify tests incremented after purchase
```

### Test Stripe Payment (Use Test Card)
- Card Number: `4242 4242 4242 4242`
- Expiry: `12/25`
- CVC: `123`
- ZIP: `12345`

---

## ✅ MONITORING & LOGGING

### View Cloudflare Logs
```bash
# Real-time logs from Workers
wrangler tail

# Persists logs for 30 days in Cloudflare Dashboard
```

### Monitor Stripe Webhooks
```bash
# In Stripe Dashboard:
1. Developers → Webhooks
2. Click your endpoint
3. View logs and responses
```

### Check KV Namespace
```bash
# View stored data
wrangler kv:key list --namespace-id=YOUR_ID

# Get specific key
wrangler kv:key get user_email@example.com --namespace-id=YOUR_ID
```

---

## ✅ COMMON ISSUES & SOLUTIONS

### Issue: "KV Namespace not found"
**Solution:** Make sure IDs in wrangler.toml match your created namespaces
```bash
wrangler kv:namespace list
```

### Issue: "Stripe API key invalid"
**Solution:** Check that you're using the correct key type (sk_ for secret, pk_ for public)

### Issue: "Workers deployed but frontend 404"
**Solution:** Make sure Pages deployment completed (can take 1-2 minutes)

### Issue: "Verdict endpoint returns 500"
**Solution:** Check wrangler logs: `wrangler tail --format json`

### Issue: "CORS errors in browser"
**Solution:** Already handled in `src/api/index.ts`, should work out of the box

---

## ✅ POST-DEPLOYMENT CHECKLIST

- [ ] Frontend loads without errors
- [ ] Landing page displays correctly
- [ ] Anonymous test works end-to-end
- [ ] Verdict generates (AI or fallback)
- [ ] Share button works
- [ ] Signup/login flows work
- [ ] User dashboard shows correct counts
- [ ] Stripe checkout redirects to Stripe
- [ ] Stripe webhook receives payment events
- [ ] KV stores data correctly
- [ ] No JavaScript console errors
- [ ] Mobile view is responsive

---

## 🎉 YOU'RE LIVE!

Once all checkboxes are checked, your app is live and ready for users.

### Share Your Launch
```
🚀 Just shipped LIT Ghost Town Test - AI-powered startup idea validator
Built with React + Cloudflare Workers + Stripe
Before you build, test if it deserves to exist.

https://lit.app
```

---

## 📞 SUPPORT

If you run into issues:
1. Check this checklist
2. View `wrangler tail` logs
3. Check Stripe logs for payment issues
4. Verify all environment variables are set
5. Ensure all git changes are committed

---

**Deployment Complete!** 🎊

Your LIT Ghost Town Test is now live and accepting users.
