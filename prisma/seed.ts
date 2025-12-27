import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Channel data template
const channelTemplates = [
  { name: 'TechGuru Reviews', category: 'Technology', niche: 'Tech Reviews' },
  { name: 'Epic Gaming Arena', category: 'Gaming', niche: 'Gaming' },
  { name: 'FitLife Training', category: 'Fitness', niche: 'Fitness & Health' },
  { name: 'Chef Delights', category: 'Food', niche: 'Cooking' },
  { name: 'Wanderlust Adventures', category: 'Travel', niche: 'Travel Vlogs' },
  { name: 'Code Masters Pro', category: 'Technology', niche: 'Programming' },
  { name: 'Beauty Secrets Daily', category: 'Lifestyle', niche: 'Beauty & Makeup' },
  { name: 'Finance Wizard', category: 'Finance', niche: 'Personal Finance' },
  { name: 'DIY Crafts Hub', category: 'Lifestyle', niche: 'DIY & Crafts' },
  { name: 'Pet Paradise', category: 'Pets', niche: 'Pet Care' },
  { name: 'Music Theory Academy', category: 'Education', niche: 'Music Education' },
  { name: 'Soccer Skills Pro', category: 'Sports', niche: 'Soccer Training' },
  { name: 'Meditation Masters', category: 'Wellness', niche: 'Meditation' },
  { name: 'Car Review Central', category: 'Automotive', niche: 'Car Reviews' },
  { name: 'Comedy Gold', category: 'Entertainment', niche: 'Comedy Sketches' },
  { name: 'Photography Pro Tips', category: 'Creative', niche: 'Photography' },
  { name: 'Crypto Insights', category: 'Finance', niche: 'Cryptocurrency' },
  { name: 'Vegan Kitchen', category: 'Food', niche: 'Vegan Cooking' },
  { name: 'Language Learning Hub', category: 'Education', niche: 'Languages' },
  { name: 'Home Renovation', category: 'Lifestyle', niche: 'Home Improvement' },
  { name: 'Science Explained', category: 'Education', niche: 'Science' },
  { name: 'Fashion Forward', category: 'Lifestyle', niche: 'Fashion' },
  { name: 'Startup Stories', category: 'Business', niche: 'Entrepreneurship' },
  { name: 'Guitar Lessons Online', category: 'Music', niche: 'Guitar Tutorials' },
  { name: 'Yoga Flow Daily', category: 'Fitness', niche: 'Yoga' },
  { name: 'Movie Reviews Plus', category: 'Entertainment', niche: 'Movie Reviews' },
  { name: 'Gardening Guide', category: 'Lifestyle', niche: 'Gardening' },
  { name: 'Basketball Drills', category: 'Sports', niche: 'Basketball' },
  { name: 'AI & Machine Learning', category: 'Technology', niche: 'AI/ML' },
  { name: 'Parenting 101', category: 'Lifestyle', niche: 'Parenting Tips' },
  { name: 'Drone Adventures', category: 'Technology', niche: 'Drone Videos' },
  { name: 'Baking Masterclass', category: 'Food', niche: 'Baking' },
  { name: 'Stock Market Daily', category: 'Finance', niche: 'Stock Trading' },
  { name: 'Mindfulness Journey', category: 'Wellness', niche: 'Mindfulness' },
  { name: 'Animation Studio', category: 'Creative', niche: 'Animation' },
];

// Realistic Indian investor names
const investorNames = [
  'Aditya Sharma', 'Priya Patel', 'Rahul Kumar', 'Sneha Reddy', 'Vikram Singh',
  'Ananya Gupta', 'Arjun Nair', 'Kavya Iyer', 'Rohan Mehta', 'Deepika Rao',
  'Karan Joshi', 'Neha Kapoor', 'Amit Verma', 'Pooja Desai', 'Sanjay Bhatt',
  'Ritu Agarwal', 'Manish Tiwari', 'Swati Mishra', 'Nikhil Saxena', 'Anjali Das',
  'Vivek Pandey', 'Shruti Bose', 'Rajesh Khanna', 'Meera Srinivasan', 'Akash Malhotra'
];

// Helper function to generate random number in range
function randomInRange(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Helper function to generate random float in range
function randomFloatInRange(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

// Generate random date within range
function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

// Helper function to generate realistic subscriber count
function generateSubscribers(): number {
  const ranges = [
    { min: 100000, max: 500000, weight: 0.3 },
    { min: 500000, max: 1500000, weight: 0.25 },
    { min: 1500000, max: 3000000, weight: 0.2 },
    { min: 3000000, max: 5000000, weight: 0.15 },
    { min: 5000000, max: 10000000, weight: 0.1 },
  ];
  
  const rand = Math.random();
  let cumulative = 0;
  
  for (const range of ranges) {
    cumulative += range.weight;
    if (rand <= cumulative) {
      return randomInRange(range.min, range.max);
    }
  }
  
  return randomInRange(1000000, 2000000);
}

async function main() {
  console.log('🌱 Starting comprehensive database seeding...');
  console.log('━'.repeat(50));

  // Create sample creators
  console.log('\n📝 Creating users...');
  
  const creators = [];
  for (let i = 1; i <= 35; i++) {
    const creator = await prisma.user.upsert({
      where: { email: `creator${i}@example.com` },
      update: {},
      create: {
        email: `creator${i}@example.com`,
        name: channelTemplates[i - 1]?.name.split(' ')[0] + ` Creator ${i}` || `Creator ${i}`,
        role: 'CREATOR',
        kycStatus: 'VERIFIED',
        emailVerified: new Date(),
      },
    });
    creators.push(creator);
  }

  // Create sample investors with diverse profiles
  const investors = [];
  for (let i = 1; i <= 25; i++) {
    const investor = await prisma.user.upsert({
      where: { email: `investor${i}@example.com` },
      update: {},
      create: {
        email: `investor${i}@example.com`,
        name: investorNames[i - 1] || `Investor ${i}`,
        role: 'INVESTOR',
        kycStatus: 'VERIFIED',
        emailVerified: new Date(),
      },
    });
    investors.push(investor);
  }

  console.log(`   ✅ Created ${creators.length} creators and ${investors.length} investors`);

  // Create wallets for all investors with initial balance
  console.log('\n💰 Creating wallets for investors...');
  
  const wallets: Array<{ id: string; investorId: string; balance: number }> = [];
  for (const investor of investors) {
    const initialBalance = randomInRange(50000, 500000);
    const totalDeposited = initialBalance + randomInRange(10000, 100000);
    const totalInvested = randomInRange(Math.floor(totalDeposited * 0.3), Math.floor(totalDeposited * 0.7));
    const totalEarnings = randomInRange(1000, 20000);

    const wallet = await prisma.wallet.upsert({
      where: { userId: investor.id },
      update: {
        balance: initialBalance,
        totalDeposited,
        totalInvested,
        totalEarnings,
      },
      create: {
        userId: investor.id,
        balance: initialBalance,
        totalDeposited,
        totalInvested,
        totalEarnings,
        currency: 'INR',
        isActive: true,
      },
    });
    wallets.push({ ...wallet, investorId: investor.id });
  }

  // Create wallets for creators too
  for (const creator of creators) {
    const earnings = randomInRange(10000, 100000);
    
    await prisma.wallet.upsert({
      where: { userId: creator.id },
      update: {},
      create: {
        userId: creator.id,
        balance: earnings,
        totalDeposited: 0,
        totalInvested: 0,
        totalEarnings: earnings,
        currency: 'INR',
        isActive: true,
      },
    });
  }

  console.log(`   ✅ Created wallets for ${wallets.length} investors and ${creators.length} creators`);

  // Create channels with realistic analytics
  console.log('\n📺 Creating YouTube channels...');

  const channels = [];
  for (let i = 0; i < channelTemplates.length; i++) {
    const template = channelTemplates[i];
    const creator = creators[i];
    
    const subscriberCount = generateSubscribers();
    const videoCount = randomInRange(150, 1200);
    const viewCount = subscriberCount * randomInRange(40, 150);
    const averageViews = Math.floor(viewCount / videoCount);
    const engagementRate = (Math.random() * 10 + 3).toFixed(1);
    
    // Calculate revenue based on subscribers and engagement
    const baseRevenue = (subscriberCount / 1000) * randomInRange(15, 35);
    const cpm = (Math.random() * 8 + 6).toFixed(1);
    const sponsorships = subscriberCount > 1000000 
      ? randomInRange(5000, 40000) 
      : randomInRange(1000, 10000);
    
    const channelSlug = template.name.toLowerCase().replaceAll(/\s+/g, '_');
    const channelHandle = template.name.toLowerCase().replaceAll(/\s+/g, '');
    
    const channel = await prisma.channel.upsert({
      where: { youtubeChannelId: `UC_${channelSlug}_${i}` },
      update: {},
      create: {
        youtubeChannelId: `UC_${channelSlug}_${i}`,
        channelName: template.name,
        channelUrl: `https://youtube.com/@${channelHandle}`,
        ownerId: creator.id,
        verified: true,
        status: 'VERIFIED',
        analytics: {
          subscriberCount,
          viewCount,
          videoCount,
          averageViews,
          engagementRate: Number.parseFloat(engagementRate),
          category: template.category,
          niche: template.niche,
        },
        revenueData: {
          monthlyRevenue: Math.floor(baseRevenue),
          cpm: Number.parseFloat(cpm),
          sponsorships,
        },
      },
    });
    
    channels.push(channel);
  }

  console.log(`   ✅ Created ${channels.length} YouTube channels`);

  // Create offerings for each channel
  console.log('\n💎 Creating channel offerings...');

  const offerings = [];
  for (const channel of channels) {
    const analytics = channel.analytics as { subscriberCount: number; niche: string };
    const revenueData = channel.revenueData as { monthlyRevenue: number; sponsorships: number };
    
    // Calculate offering parameters based on channel metrics
    const totalRevenue = revenueData.monthlyRevenue + revenueData.sponsorships;
    const sharePercentage = randomInRange(10, 30);
    const totalShares = randomInRange(5000, 20000);
    const sharesAvailablePercent = randomInRange(15, 65);
    const availableShares = Math.floor(totalShares * (sharesAvailablePercent / 100));
    
    // Price per share based on revenue and subscriber count
    const basePrice = (totalRevenue / 100) + (analytics.subscriberCount / 50000);
    const pricePerShare = Number.parseFloat((basePrice * (Math.random() * 0.4 + 0.8)).toFixed(2));
    
    const minInvestment = Math.floor(pricePerShare * randomInRange(5, 15));
    const maxInvestment = minInvestment * randomInRange(40, 100);
    const duration = [12, 18, 24, 30, 36][randomInRange(0, 4)];
    
    const offering = await prisma.offering.create({
      data: {
        channelId: channel.id,
        title: `${channel.channelName} - Investment Opportunity`,
        description: `Invest in ${analytics.niche} content. ${
          analytics.subscriberCount > 2000000 
            ? 'Established channel with strong growth.' 
            : 'Growing channel with great potential.'
        } Share in ad revenue and sponsorship deals.`,
        sharePercentage,
        totalShares,
        availableShares,
        pricePerShare,
        minInvestment,
        maxInvestment,
        duration,
        status: 'ACTIVE',
      },
    });
    
    offerings.push(offering);
  }

  console.log(`   ✅ Created ${offerings.length} offerings`);

  // Create investments with varying statuses
  console.log('\n📊 Creating investments...');
  
  interface InvestmentRecord {
    id: string;
    investorId: string;
    offeringId: string;
    shares: number;
    totalAmount: number;
  }
  
  const investments: InvestmentRecord[] = [];
  let totalInvestmentsCount = 0;

  for (const offering of offerings) {
    // Random number of investors per offering (between 10-50)
    const numInvestors = randomInRange(10, 50);
    const selectedInvestors = [...investors].sort(() => Math.random() - 0.5).slice(0, numInvestors);
    
    for (const investor of selectedInvestors) {
      const shares = randomInRange(5, 200);
      const totalAmount = shares * offering.pricePerShare;

      const investment = await prisma.investment.create({
        data: {
          investorId: investor.id,
          offeringId: offering.id,
          shares,
          totalAmount,
          status: 'CONFIRMED',
          createdAt: randomDate(new Date('2024-01-01'), new Date()),
        },
      });

      investments.push({
        id: investment.id,
        investorId: investor.id,
        offeringId: offering.id,
        shares: investment.shares,
        totalAmount: investment.totalAmount,
      });
      totalInvestmentsCount++;
    }
  }

  console.log(`   ✅ Created ${totalInvestmentsCount} investments`);

  // Create sell orders for some investments
  console.log('\n📋 Creating sell orders...');
  
  // Select random investments to create sell orders for (about 20%)
  const investmentsForSellOrders = investments
    .filter(inv => inv.shares >= 10) // Only investments with enough shares
    .sort(() => Math.random() - 0.5)
    .slice(0, Math.floor(investments.length * 0.2));

  interface SellOrderRecord {
    id: string;
    sellerId: string;
    investmentId: string;
    offeringId: string;
    sharesListed: number;
    sharesRemaining: number;
    pricePerShare: number;
    status: string;
  }
  
  const sellOrders: SellOrderRecord[] = [];
  
  for (const investment of investmentsForSellOrders) {
    const offering = offerings.find(o => o.id === investment.offeringId);
    if (!offering) continue;

    // Sell a portion of shares (30-80% of their holdings)
    const sharesToSell = Math.floor(investment.shares * randomFloatInRange(0.3, 0.8));
    if (sharesToSell < 1) continue;

    // Price variation from original (-15% to +25%)
    const priceMultiplier = randomFloatInRange(0.85, 1.25);
    const askingPrice = Number.parseFloat((offering.pricePerShare * priceMultiplier).toFixed(2));
    
    const minShares = Math.min(randomInRange(1, 5), sharesToSell);

    const sellOrder = await prisma.sellOrder.create({
      data: {
        sellerId: investment.investorId,
        investmentId: investment.id,
        offeringId: investment.offeringId,
        sharesListed: sharesToSell,
        sharesRemaining: sharesToSell,
        pricePerShare: askingPrice,
        minShares,
        status: 'ACTIVE',
        createdAt: randomDate(new Date('2024-06-01'), new Date()),
      },
    });

    sellOrders.push({
      id: sellOrder.id,
      sellerId: sellOrder.sellerId,
      investmentId: sellOrder.investmentId,
      offeringId: sellOrder.offeringId,
      sharesListed: sellOrder.sharesListed,
      sharesRemaining: sellOrder.sharesRemaining,
      pricePerShare: sellOrder.pricePerShare,
      status: sellOrder.status,
    });
  }

  console.log(`   ✅ Created ${sellOrders.length} sell orders`);

  // Create some completed trades
  console.log('\n🔄 Creating trade history...');
  
  const PLATFORM_FEE_PERCENT = 2.5;
  let tradesCount = 0;

  // Select some sell orders to create completed trades for
  const ordersForTrades = sellOrders
    .sort(() => Math.random() - 0.5)
    .slice(0, Math.floor(sellOrders.length * 0.5));

  for (const sellOrder of ordersForTrades) {
    // Find a buyer (different from seller)
    const buyer = investors.find(inv => inv.id !== sellOrder.sellerId);
    if (!buyer) continue;

    // Trade a portion of the listed shares
    const tradedShares = Math.floor(sellOrder.sharesListed * randomFloatInRange(0.2, 0.6));
    if (tradedShares < 1) continue;

    const totalAmount = tradedShares * sellOrder.pricePerShare;
    const platformFee = totalAmount * (PLATFORM_FEE_PERCENT / 100);
    const netAmount = totalAmount - platformFee;

    // Get or find/create buyer's investment in this offering
    let buyerInvestment = investments.find(
      inv => inv.investorId === buyer.id && inv.offeringId === sellOrder.offeringId
    );

    if (!buyerInvestment) {
      // Create a new investment for the buyer
      const newInvestment = await prisma.investment.create({
        data: {
          investorId: buyer.id,
          offeringId: sellOrder.offeringId,
          shares: tradedShares,
          totalAmount,
          status: 'CONFIRMED',
        },
      });
      buyerInvestment = {
        id: newInvestment.id,
        investorId: buyer.id,
        offeringId: sellOrder.offeringId,
        shares: tradedShares,
        totalAmount,
      };
    } else {
      // Update existing investment
      await prisma.investment.update({
        where: { id: buyerInvestment.id },
        data: {
          shares: { increment: tradedShares },
          totalAmount: { increment: totalAmount },
        },
      });
    }

    // Create trade record
    await prisma.trade.create({
      data: {
        sellOrderId: sellOrder.id,
        buyerId: buyer.id,
        sellerId: sellOrder.sellerId,
        offeringId: sellOrder.offeringId,
        shares: tradedShares,
        pricePerShare: sellOrder.pricePerShare,
        totalAmount,
        platformFee,
        netAmount,
        status: 'COMPLETED',
        completedAt: new Date(),
        buyerInvestmentId: buyerInvestment.id,
      },
    });

    // Update sell order
    const newSharesRemaining = sellOrder.sharesRemaining - tradedShares;
    await prisma.sellOrder.update({
      where: { id: sellOrder.id },
      data: {
        sharesRemaining: newSharesRemaining,
        status: newSharesRemaining === 0 ? 'FILLED' : 'PARTIALLY_FILLED',
      },
    });

    // Update seller's investment shares
    await prisma.investment.update({
      where: { id: sellOrder.investmentId },
      data: {
        shares: { decrement: tradedShares },
      },
    });

    tradesCount++;
  }

  console.log(`   ✅ Created ${tradesCount} completed trades`);

  // Update available shares based on investments
  console.log('\n🔄 Updating available shares...');
  
  for (const offering of offerings) {
    const offeringInvestments = await prisma.investment.findMany({
      where: { offeringId: offering.id, status: 'CONFIRMED' },
    });

    const totalSharesSold = offeringInvestments.reduce((sum, inv) => sum + inv.shares, 0);
    const availableShares = Math.max(0, offering.totalShares - totalSharesSold);

    await prisma.offering.update({
      where: { id: offering.id },
      data: { availableShares },
    });
  }

  console.log('   ✅ Updated available shares');

  // Create some wallet transactions for realism
  console.log('\n📝 Creating wallet transaction history...');
  
  let transactionsCount = 0;
  for (const wallet of wallets.slice(0, 15)) { // Add transactions for first 15 investors
    // Add deposit transactions
    const numDeposits = randomInRange(2, 5);
    for (let i = 0; i < numDeposits; i++) {
      const depositAmount = randomInRange(10000, 100000);
      await prisma.transaction.create({
        data: {
          userId: wallet.investorId,
          type: 'DEPOSIT',
          amount: depositAmount,
          fee: 0,
          netAmount: depositAmount,
          status: 'COMPLETED',
          referenceType: 'wallet_deposit',
          description: 'Wallet deposit',
          completedAt: randomDate(new Date('2024-01-01'), new Date()),
        },
      });
      transactionsCount++;
    }

    // Add investment transactions
    const userInvestments = investments.filter(inv => inv.investorId === wallet.investorId);
    for (const investment of userInvestments.slice(0, 3)) {
      await prisma.transaction.create({
        data: {
          userId: wallet.investorId,
          type: 'INVESTMENT',
          amount: investment.totalAmount,
          fee: 0,
          netAmount: investment.totalAmount,
          status: 'COMPLETED',
          referenceType: 'investment',
          referenceId: investment.id,
          description: `Investment in offering`,
          completedAt: randomDate(new Date('2024-03-01'), new Date()),
        },
      });
      transactionsCount++;
    }
  }

  console.log(`   ✅ Created ${transactionsCount} wallet transactions`);

  // Display summary statistics
  const stats = {
    totalChannels: channels.length,
    totalCreators: creators.length,
    totalInvestors: investors.length,
    totalOfferings: offerings.length,
    totalInvestments: totalInvestmentsCount,
    totalSellOrders: sellOrders.length,
    totalTrades: tradesCount,
    totalTransactions: transactionsCount,
    categories: [...new Set(channels.map(ch => (ch.analytics as { category: string }).category))],
    activeSellOrders: sellOrders.filter(o => o.status === 'ACTIVE').length,
  };

  console.log('\n' + '━'.repeat(50));
  console.log('🎉 Database seeding completed successfully!');
  console.log('━'.repeat(50));
  console.log('\n📈 Summary:');
  console.log(`   👥 ${stats.totalCreators} Creators`);
  console.log(`   💼 ${stats.totalInvestors} Investors`);
  console.log(`   📺 ${stats.totalChannels} YouTube Channels`);
  console.log(`   💎 ${stats.totalOfferings} Active Offerings`);
  console.log(`   📊 ${stats.totalInvestments} Investments`);
  console.log(`   📋 ${stats.totalSellOrders} Sell Orders (${stats.activeSellOrders} active)`);
  console.log(`   🔄 ${stats.totalTrades} Completed Trades`);
  console.log(`   💰 ${stats.totalTransactions} Wallet Transactions`);
  console.log(`   📁 ${stats.categories.length} Categories: ${stats.categories.join(', ')}`);
  console.log('\n' + '━'.repeat(50));
  
  console.log('\n💡 Tips for testing:');
  console.log('   • Login as investor1@example.com to investor25@example.com');
  console.log('   • Login as creator1@example.com to creator35@example.com');
  console.log('   • Each investor has a funded wallet ready for trading');
  console.log('   • Active sell orders are available in the marketplace');
  console.log('   • Use the demo-fund API to add more test funds');
  console.log('\n');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
