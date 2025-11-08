# YouTube Channel Exchange Platform

A comprehensive platform enabling YouTube creators to raise funds through revenue-sharing agreements and fractional channel stakes. Investors can browse, invest, and trade shares while receiving transparent, automated revenue distributions.

---

## 🚀 Features Implemented

### **Core Functionality**

✅ **Creator Onboarding**
- Google OAuth integration with YouTube API access
- Automatic channel verification and ownership validation
- Real-time analytics fetching (subscribers, views, engagement)
- Revenue estimation based on channel metrics

✅ **Marketplace**
- Browse active revenue-share offerings
- Filter by category, minimum investment, and performance
- Detailed offering pages with channel analytics
- Real-time funding progress tracking

✅ **Investment Flow**
- KYC verification with compliance checks
- Investment eligibility validation
- Stripe payment integration with escrow
- Automated share allocation

✅ **Revenue Distribution**
- Monthly revenue reconciliation system
- Automated payout calculations (5% platform fee)
- Investor payout tracking and history
- Multi-offering support per channel

✅ **Dashboards**
- **Creator Dashboard**: Manage channels, offerings, and investor relations
- **Investor Dashboard**: Portfolio tracking, ROI calculations, payout history

---

## 🏗️ Architecture

### Tech Stack
- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: PostgreSQL
- **Authentication**: NextAuth.js with Google OAuth
- **Payments**: Stripe (supports cards, bank transfers)
- **YouTube Integration**: Google YouTube Data API v3
- **UI Components**: Radix UI, Lucide Icons

### Database Schema
- **Users**: Multi-role (Creator/Investor/Admin) with KYC status
- **Channels**: Verified YouTube channels with analytics
- **Offerings**: Revenue-share opportunities with terms
- **Investments**: Share purchases and ownership tracking
- **Payouts**: Monthly revenue distributions
- **Transactions**: Complete payment history

---

## 📦 Setup & Installation

### Prerequisites
- Node.js 18+ and npm/yarn
- PostgreSQL database
- Google Cloud Console account (for YouTube API)
- Stripe account (for payments)

### Step 1: Clone and Install

```bash
cd /home/gulshan/youtube-feature
npm install
```

### Step 2: Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

**Required configurations:**

1. **Database**
   ```
   DATABASE_URL="postgresql://user:password@localhost:5432/youtube_platform"
   ```

2. **Google OAuth + YouTube API**
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Create a new project
   - Enable YouTube Data API v3
   - Create OAuth 2.0 credentials
   - Add authorized redirect URI: `http://localhost:8000/api/auth/callback/google`
   - Add scopes: `email`, `profile`, `https://www.googleapis.com/auth/youtube.readonly`
   
   ```
   GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
   GOOGLE_CLIENT_SECRET="your-client-secret"
   ```

3. **NextAuth**
   ```bash
   # Generate secret
   openssl rand -base64 32
   ```
   ```
   NEXTAUTH_URL="http://localhost:8000"
   NEXTAUTH_SECRET="generated-secret-here"
   ```

4. **Stripe**
   - Create account at [stripe.com](https://stripe.com)
   - Get API keys from dashboard
   ```
   STRIPE_SECRET_KEY="sk_test_..."
   STRIPE_PUBLISHABLE_KEY="pk_test_..."
   STRIPE_WEBHOOK_SECRET="whsec_..." # After setting up webhook
   ```

### Step 3: Database Setup

```bash
# Generate Prisma client
npm run db:generate

# Push schema to database
npm run db:push

# (Optional) Open Prisma Studio to view data
npm run db:studio
```

### Step 4: Run Development Server

```bash
npm run dev
```

Visit `http://localhost:8000`

---

## 📋 API Endpoints

### Authentication
- `GET/POST /api/auth/[...nextauth]` - NextAuth.js routes

### Creator APIs
- `POST /api/creator/channel` - Verify and connect YouTube channel
- `GET /api/creator/channel` - Get creator's channels
- `POST /api/creator/offering` - Create revenue-share offering
- `GET /api/creator/offering` - Get creator's offerings

### Marketplace APIs
- `GET /api/marketplace` - List all active offerings (with filters)
- `GET /api/marketplace/[id]` - Get offering details

### Investment APIs
- `POST /api/investment` - Create investment (with KYC check)
- `GET /api/investment` - Get investor's portfolio

### KYC APIs
- `POST /api/kyc` - Submit KYC data
- `GET /api/kyc` - Check KYC status

### Payout APIs
- `POST /api/payout/reconcile` - Process monthly revenue distribution

---

## 🎯 User Flows

### **Creator Flow**

1. **Sign Up** → Google OAuth authentication
2. **Connect Channel** → Verify YouTube ownership via API
3. **View Analytics** → System fetches 12-month performance data
4. **Create Offering** → Set revenue %, shares, price, duration
5. **Await Approval** → Admin reviews (status: PENDING_APPROVAL)
6. **Go Live** → Offering becomes ACTIVE in marketplace
7. **Monthly Reporting** → Submit revenue via reconciliation API
8. **Auto Payouts** → System distributes to investors

### **Investor Flow**

1. **Sign Up** → Create account
2. **Complete KYC** → Submit identity verification
3. **Browse Marketplace** → Filter and discover offerings
4. **View Details** → Channel analytics, terms, investor count
5. **Invest** → Select shares, process payment via Stripe
6. **Receive Shares** → Confirmed after payment success
7. **Track Performance** → Dashboard shows ROI and payouts
8. **Monthly Payouts** → Automatic revenue distributions

---

## 🔐 Security & Compliance

### Implemented Features
- ✅ **OAuth 2.0** for secure YouTube channel verification
- ✅ **KYC/AML checks** before investment eligibility
- ✅ **Investment limits**: $2,500 per transaction, $10,000 total
- ✅ **Escrow system**: Funds held until offering completion
- ✅ **Encrypted data storage** for sensitive KYC information
- ✅ **Role-based access control** (Creator/Investor/Admin)

### Production Recommendations
- ⚠️ Integrate professional KYC provider (Onfido, Stripe Identity, IDfy)
- ⚠️ Consult legal counsel for securities compliance
- ⚠️ Implement rate limiting and DDoS protection
- ⚠️ Add fraud detection for revenue reporting
- ⚠️ Enable 2FA for high-value accounts
- ⚠️ Audit smart contracts if tokenizing shares

---

## 💰 Revenue Model

**Platform Fee**: 5% of gross channel revenue before investor payouts

**Example Calculation**:
```
Channel monthly revenue: $10,000
Offering: 20% revenue share, 1000 shares
Platform fee (5%): $500
Investor pool: $9,500
Per offering: $9,500 × 20% = $1,900
Per share: $1,900 / 1000 = $1.90
```

---

## 🔄 Revenue Reconciliation Flow

```mermaid
sequenceDiagram
    Creator->>API: Submit monthly revenue
    API->>Database: Fetch active offerings
    API->>Database: Calculate investor shares
    API->>Stripe: Process payouts
    Stripe->>Investors: Distribute payments
    API->>Database: Record payout history
    API->>Creator: Deduct platform fee
```

---

## 📊 Database Relationships

```
User (1) ←→ (N) Channel
Channel (1) ←→ (N) Offering
Offering (1) ←→ (N) Investment
Investment (1) ←→ (N) Payout
User (1) ←→ (N) Transaction
```

---

## 🧪 Testing Checklist

### MVP Testing
- [ ] Creator can connect YouTube channel
- [ ] Analytics fetched correctly
- [ ] Offering creation with validation
- [ ] Investor can browse marketplace
- [ ] KYC submission and status check
- [ ] Investment flow with Stripe test mode
- [ ] Revenue reconciliation calculation
- [ ] Payout distribution
- [ ] Dashboard data accuracy

---

## 🚦 Next Steps (Post-MVP)

### Phase 2 - Secondary Market
- [ ] Peer-to-peer share trading
- [ ] Order book implementation
- [ ] Price discovery mechanism
- [ ] Transfer fee structure

### Phase 3 - Advanced Features
- [ ] Security token issuance (ERC-1400)
- [ ] Smart contract automation
- [ ] Multi-currency support
- [ ] Mobile app (React Native)
- [ ] Creator analytics dashboard
- [ ] Investor communication tools

### Phase 4 - Scale & Compliance
- [ ] Institutional investor onboarding
- [ ] Accredited investor verification
- [ ] SEC/regulatory approval (if US-based)
- [ ] Tax reporting (1099 generation)
- [ ] International expansion

---

## 📝 Legal Considerations

⚠️ **IMPORTANT**: This platform deals with securities regulations. Before launch:

1. **Securities Law**: Determine if offerings qualify as securities
2. **Registration**: Register with appropriate regulatory bodies (SEC, FCA, etc.)
3. **Exemptions**: Explore Reg CF, Reg A+, or Reg D exemptions
4. **Terms of Service**: Draft comprehensive user agreements
5. **Risk Disclosures**: Clear investment risk warnings
6. **Privacy Policy**: GDPR, CCPA compliance
7. **Anti-Money Laundering**: Implement robust AML procedures

---

## 🤝 Contributing

This is a proprietary project. For questions or issues:
- Email: admin@yourplatform.com
- Documentation: `/docs/legal-framework.md`

---

## 📄 License

Proprietary - All Rights Reserved

---

## 🆘 Support

### Common Issues

**Database Connection Error**
```bash
# Check PostgreSQL is running
sudo service postgresql status
# Verify DATABASE_URL in .env
```

**YouTube API Error**
```bash
# Ensure YouTube Data API v3 is enabled in Google Cloud Console
# Verify OAuth scopes include youtube.readonly
```

**Stripe Webhook Issues**
```bash
# Use Stripe CLI for local testing
stripe listen --forward-to localhost:8000/api/webhooks/stripe
```

---

Built with ❤️ for the creator economy
