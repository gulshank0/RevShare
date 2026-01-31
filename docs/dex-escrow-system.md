# DEX Escrow System - RevShare Platform

## Overview

The DEX (Decentralized Exchange) Escrow System provides a trustless, transparent mechanism for distributing YouTube channel revenue between creators and investors. Neither party has direct control over the funds - the system operates on predefined smart contract-like rules.

## Key Principles

### 1. Trustless Escrow
- All revenue is deposited into an escrow vault
- Neither creators nor investors can directly access funds
- Distribution follows immutable rules based on ownership percentages

### 2. Automatic Distribution
- When revenue is deposited, it's automatically distributed
- Platform fee (5%) is deducted first
- Remaining funds split based on ownership percentages

### 3. Transparent Audit Trail
- All operations are logged with cryptographic signatures
- Complete history available to all stakeholders
- Immutable record for dispute resolution

### 4. Time-Bound Claims
- Distributed funds become "claims" for users
- Claims expire after 90 days if not processed
- Users must actively claim their earnings

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    DEX ESCROW SYSTEM                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐       │
│  │   Creator   │────▶│   Escrow    │────▶│  Investors  │       │
│  │  Deposits   │     │   Vault     │     │   Claims    │       │
│  │  Revenue    │     │             │     │             │       │
│  └─────────────┘     └─────────────┘     └─────────────┘       │
│                             │                                   │
│                      ┌──────▼──────┐                           │
│                      │  Automatic   │                           │
│                      │ Distribution │                           │
│                      │    Engine    │                           │
│                      └──────────────┘                           │
│                             │                                   │
│                      ┌──────▼──────┐                           │
│                      │   Audit     │                           │
│                      │    Log      │                           │
│                      └─────────────┘                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Database Models

### EscrowVault
The central vault for each offering that holds all deposited revenue.

```typescript
{
  offeringId: string;
  totalBalance: number;      // Current funds in escrow
  pendingRelease: number;    // Funds awaiting distribution
  totalDistributed: number;  // Historical total
  creatorShare: number;      // Creator's unclaimed balance
  investorPool: number;      // Total investor unclaimed balance
  status: 'ACTIVE' | 'PAUSED' | 'CLOSED' | 'DISPUTED';
}
```

### EscrowDeposit
Records each revenue deposit into the escrow.

```typescript
{
  vaultId: string;
  amount: number;
  source: 'YOUTUBE_ADSENSE' | 'YOUTUBE_PREMIUM' | 'SPONSORSHIP' | ...;
  revenueMonth: string;  // YYYY-MM format
  status: 'PENDING' | 'VERIFIED' | 'DISTRIBUTED';
}
```

### EscrowDistribution
Records automatic distribution events.

```typescript
{
  vaultId: string;
  totalAmount: number;
  creatorAmount: number;
  investorAmount: number;
  platformFee: number;
  distributionRatio: object;  // Ownership snapshot at distribution time
}
```

### EscrowClaim
Individual claims for each stakeholder.

```typescript
{
  userId: string;
  claimantType: 'CREATOR' | 'INVESTOR';
  amount: number;
  ownershipPercent: number;
  status: 'AVAILABLE' | 'CLAIMED' | 'EXPIRED';
  expiresAt: Date;
}
```

### EscrowAuditLog
Immutable audit trail.

```typescript
{
  vaultId: string;
  action: string;
  actorType: 'SYSTEM' | 'CREATOR' | 'INVESTOR' | 'ADMIN';
  amount: number;
  signature: string;  // Cryptographic signature
}
```

## API Endpoints

### Vault Management

**GET /api/dex/vault?offeringId={id}**
Get vault details and ownership snapshot.

**POST /api/dex/vault**
Create a new escrow vault for an offering.

### Revenue Deposits

**GET /api/dex/deposit?offeringId={id}**
Get deposit history.

**POST /api/dex/deposit**
Deposit revenue into escrow.

```json
{
  "offeringId": "string",
  "amount": 10000,
  "revenueMonth": "2024-12",
  "source": "YOUTUBE_ADSENSE",
  "autoDistribute": true
}
```

### Distributions

**GET /api/dex/distribute?offeringId={id}**
Get distribution history.

**POST /api/dex/distribute**
Trigger manual distribution.

### Claims

**GET /api/dex/claims**
Get user's claims.

**POST /api/dex/claims**
Process claims.

```json
// Single claim
{ "claimId": "string" }

// Claim all available
{ "claimAll": true }
```

### Ownership

**GET /api/dex/ownership?offeringId={id}**
Get ownership distribution.

### Audit

**GET /api/dex/audit?offeringId={id}**
Get audit trail.

## Revenue Distribution Formula

```
Gross Revenue from YouTube
         │
         ▼
┌─────────────────────────┐
│ Platform Fee (5%)       │ ──▶ Platform Revenue
└─────────────────────────┘
         │
         ▼
    Net Revenue
         │
         ▼
┌─────────────────────────┐
│ Ownership Calculation   │
│                         │
│ Creator Share =         │
│   Net × (100% - sold%)  │
│                         │
│ Investor Share =        │
│   Net × (investor_%)    │
└─────────────────────────┘
         │
         ▼
   Create Claims
```

### Example

```
Gross Revenue: ₹100,000
Offering: 20% revenue share, 1000 total shares

Investor A owns 500 shares (10% of revenue)
Investor B owns 300 shares (6% of revenue)
Investor C owns 200 shares (4% of revenue)
Creator retains: 80% of revenue

Distribution:
- Platform Fee: ₹5,000 (5%)
- Net Revenue: ₹95,000

- Creator: ₹76,000 (80%)
- Investor A: ₹9,500 (10%)
- Investor B: ₹5,700 (6%)
- Investor C: ₹3,800 (4%)
```

## Security Features

### Cryptographic Signatures
Each audit entry is signed using HMAC-SHA256:
```typescript
signature = HMAC-SHA256(payload, ESCROW_SECRET_KEY)
```

### Immutable Audit Log
- All actions are logged before execution
- Logs cannot be modified or deleted
- Complete transparency for all parties

### Time-Bound Claims
- Claims expire after 90 days
- Prevents indefinite fund locking
- Expired claims can be reallocated

## Integration with Buy/Sell

### When Shares Are Bought
1. Investment creates/updates ownership record
2. Ownership percentage recalculates automatically
3. Next distribution uses new percentages

### When Shares Are Sold
1. Seller's ownership decreases
2. Buyer's ownership increases (or created)
3. No impact on pending claims

## Future: Blockchain Integration

The system is designed for future blockchain integration:

### ShareToken Model
```typescript
{
  tokenSymbol: string;      // e.g., "YT-PEWDS-001"
  contractAddress: string;  // ERC-20/ERC-1155 contract
  tokenId: string;          // On-chain token ID
}
```

### Planned Features
- ERC-20 tokens representing shares
- Smart contract escrow on Ethereum/Polygon
- Decentralized claim processing
- Cross-platform trading

## Environment Variables

```env
# Required for escrow signature generation
ESCROW_SECRET_KEY=your-secret-key

# Optional: For future blockchain integration
BLOCKCHAIN_RPC_URL=https://polygon-rpc.com
ESCROW_CONTRACT_ADDRESS=0x...
```

## Usage Examples

### Creator: Deposit Revenue
```typescript
const response = await fetch('/api/dex/deposit', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    offeringId: 'offering-id',
    amount: 50000,
    revenueMonth: '2024-12',
    source: 'YOUTUBE_ADSENSE',
    autoDistribute: true,
  }),
});
```

### Investor: Claim Earnings
```typescript
// Claim all available
const response = await fetch('/api/dex/claims', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ claimAll: true }),
});
```

### View Ownership
```typescript
const response = await fetch('/api/dex/ownership?offeringId=offering-id');
const { ownership } = await response.json();

console.log(`Creator owns ${ownership.creator.ownershipPercent}%`);
ownership.investors.forEach(inv => {
  console.log(`${inv.name} owns ${inv.ownershipPercent}%`);
});
```

## Error Handling

| Error | Cause | Resolution |
|-------|-------|------------|
| Vault not found | Offering not active | Activate offering first |
| Claim expired | 90 days passed | Contact support |
| Insufficient funds | Already distributed | Wait for next revenue |
| Unauthorized | Not a stakeholder | Must be creator/investor |

## Best Practices

1. **Regular Claims**: Claim earnings regularly to avoid expiration
2. **Revenue Verification**: Wait for deposit verification before distribution
3. **Audit Review**: Regularly review audit logs for transparency
4. **Dispute Early**: Raise disputes within claim expiry period
