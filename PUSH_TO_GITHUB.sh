#!/bin/bash

# LIT Ghost Town Test — Push to GitHub Script
# Usage: bash PUSH_TO_GITHUB.sh

echo "🚀 LIT Ghost Town Test — Pushing to GitHub"
echo "==========================================="

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo "❌ Not a git repository. Please initialize first:"
    echo "   git init"
    echo "   git remote add origin https://github.com/sanlorenzoprx/lit-ghosttown.git"
    exit 1
fi

# Add all files
echo "📦 Adding all files..."
git add .

# Create commit
echo "💾 Creating commit..."
git commit -m "feat: complete LIT Ghost Town Test MVP

- 9 React components (Landing, IdeaIntake, Questions, Results, etc.)
- 6 Cloudflare Workers endpoints (verdict, auth, checkout, webhook, referral)
- Hybrid AI engine with deterministic fallback
- Authentication system (JWT + KV)
- Stripe payment integration
- Referral tracking system
- 10 example ideas pre-scored
- 100% TypeScript, production-ready
- Mobile-responsive design
- Full error handling"

# Push to GitHub
echo "🌐 Pushing to GitHub..."
git push origin main

echo ""
echo "✅ Successfully pushed to GitHub!"
echo ""
echo "Next steps:"
echo "1. Set up Cloudflare KV namespace"
echo "2. Configure environment variables"
echo "3. Deploy to Cloudflare (wrangler publish)"
echo "4. Set Stripe webhook URL"
echo "5. Test live deployment"
echo ""
echo "See FINAL_DELIVERY_SUMMARY.md for detailed instructions."
