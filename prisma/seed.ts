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

// Helper function to generate random number in range
function randomInRange(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
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
  console.log('🌱 Starting database seeding...');

  // Create sample creators
  console.log('📝 Creating users...');
  
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

  // Create sample investors
  const investors = [];
  for (let i = 1; i <= 25; i++) {
    const investor = await prisma.user.upsert({
      where: { email: `investor${i}@example.com` },
      update: {},
      create: {
        email: `investor${i}@example.com`,
        name: `Investor ${i}`,
        role: 'INVESTOR',
        kycStatus: 'VERIFIED',
        emailVerified: new Date(),
      },
    });
    investors.push(investor);
  }

  console.log(`✅ Created ${creators.length} creators and ${investors.length} investors`);

  // Create channels with realistic analytics
  console.log('📺 Creating YouTube channels...');

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
    
    const channel = await prisma.channel.upsert({
      where: { youtubeChannelId: `UC_${template.name.toLowerCase().replace(/\s+/g, '_')}_${i}` },
      update: {},
      create: {
        youtubeChannelId: `UC_${template.name.toLowerCase().replace(/\s+/g, '_')}_${i}`,
        channelName: template.name,
        channelUrl: `https://youtube.com/@${template.name.toLowerCase().replace(/\s+/g, '')}`,
        ownerId: creator.id,
        verified: true,
        status: 'VERIFIED',
        analytics: {
          subscriberCount,
          viewCount,
          videoCount,
          averageViews,
          engagementRate: parseFloat(engagementRate),
          category: template.category,
          niche: template.niche,
        },
        revenueData: {
          monthlyRevenue: Math.floor(baseRevenue),
          cpm: parseFloat(cpm),
          sponsorships,
        },
      },
    });
    
    channels.push(channel);
  }

  console.log(`✅ Created ${channels.length} YouTube channels`);

  // Create offerings for each channel
  console.log('💰 Creating channel offerings...');

  const offerings = [];
  for (const channel of channels) {
    const analytics = channel.analytics as any;
    const revenueData = channel.revenueData as any;
    
    // Calculate offering parameters based on channel metrics
    const totalRevenue = revenueData.monthlyRevenue + revenueData.sponsorships;
    const sharePercentage = randomInRange(10, 30);
    const totalShares = randomInRange(5000, 20000);
    const sharesAvailablePercent = randomInRange(15, 65);
    const availableShares = Math.floor(totalShares * (sharesAvailablePercent / 100));
    
    // Price per share based on revenue and subscriber count
    const basePrice = (totalRevenue / 100) + (analytics.subscriberCount / 50000);
    const pricePerShare = parseFloat((basePrice * (Math.random() * 0.4 + 0.8)).toFixed(2));
    
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

  console.log(`✅ Created ${offerings.length} offerings`);

  // Create investments
  console.log('📊 Creating investments...');
  
  let totalInvestments = 0;

  for (const offering of offerings) {
    // Random number of investors per offering (between 10-50)
    const numInvestors = randomInRange(10, 50);
    
    for (let i = 0; i < numInvestors; i++) {
      const investor = investors[randomInRange(0, investors.length - 1)];
      const shares = randomInRange(5, 200);
      const totalAmount = shares * offering.pricePerShare;

      await prisma.investment.create({
        data: {
          investorId: investor.id,
          offeringId: offering.id,
          shares,
          totalAmount,
          status: 'CONFIRMED',
        },
      });

      totalInvestments++;
    }
  }

  console.log(`✅ Created ${totalInvestments} investments`);

  // Update available shares based on investments
  console.log('🔄 Updating available shares...');
  
  for (const offering of offerings) {
    const investments = await prisma.investment.findMany({
      where: { offeringId: offering.id, status: 'CONFIRMED' },
    });

    const totalSharesSold = investments.reduce((sum, inv) => sum + inv.shares, 0);
    const availableShares = Math.max(0, offering.totalShares - totalSharesSold);

    await prisma.offering.update({
      where: { id: offering.id },
      data: { availableShares },
    });
  }

  console.log('✅ Updated available shares');

  // Display summary statistics
  const stats = {
    totalChannels: channels.length,
    totalCreators: creators.length,
    totalInvestors: investors.length,
    totalOfferings: offerings.length,
    totalInvestments,
    categories: [...new Set(channels.map(ch => (ch.analytics as any).category))],
  };

  console.log('🎉 Database seeding completed successfully!');
  console.log('\n📈 Summary:');
  console.log(`   - ${stats.totalCreators} Creators`);
  console.log(`   - ${stats.totalInvestors} Investors`);
  console.log(`   - ${stats.totalChannels} YouTube Channels`);
  console.log(`   - ${stats.totalOfferings} Active Offerings`);
  console.log(`   - ${stats.totalInvestments} Investments`);
  console.log(`   - ${stats.categories.length} Categories: ${stats.categories.join(', ')}`);
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
