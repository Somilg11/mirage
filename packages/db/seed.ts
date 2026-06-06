import 'dotenv/config';
import { prisma } from './index';

async function main() {
  console.log('Seeding database...');

  // Example orderbook shapes: price levels mapped to { availableQuantity, orders }
  const orderbook1_yes = {
    '20': { availableQuantity: 50, orders: [{ userId: 'market-maker-1', quantity: 50 }] },
    '30': { availableQuantity: 20, orders: [{ userId: 'retail-1', quantity: 20 }] }
  };
  const orderbook1_no = {
    '70': { availableQuantity: 40, orders: [{ userId: 'market-maker-2', quantity: 40 }] },
    '60': { availableQuantity: 10, orders: [{ userId: 'retail-2', quantity: 10 }] }
  };

  const orderbook2_yes = {
    '10': { availableQuantity: 30, orders: [{ userId: 'mm-3', quantity: 30 }] },
  };
  const orderbook2_no = {
    '90': { availableQuantity: 15, orders: [{ userId: 'mm-4', quantity: 15 }] },
  };

  // Create sample markets with richer metadata
  const m1 = await prisma.market.upsert({
    where: { id: 'market-1' },
    update: {},
    create: {
      id: 'market-1',
      title: 'Will Bitcoin be above $50k on 2026-01-01?',
      description: 'Bitcoin price prediction at start of 2026',
      resolutionDescription: '',
      yesOrderBook: JSON.stringify(orderbook1_yes),
      noOrderBook: JSON.stringify(orderbook1_no),
      totalQty: 130,
    }
  });

  const m2 = await prisma.market.upsert({
    where: { id: 'market-2' },
    update: {},
    create: {
      id: 'market-2',
      title: 'Will candidate X win the election?',
      description: 'Major election outcome prediction',
      resolutionDescription: '',
      yesOrderBook: JSON.stringify(orderbook2_yes),
      noOrderBook: JSON.stringify(orderbook2_no),
      totalQty: 55,
    }
  });

  const orderbook3_yes = {
    '40': { availableQuantity: 25, orders: [{ userId: 'mm-5', quantity: 25 }] },
    '45': { availableQuantity: 15, orders: [{ userId: 'retail-3', quantity: 15 }] }
  };
  const orderbook3_no = {
    '55': { availableQuantity: 30, orders: [{ userId: 'mm-6', quantity: 30 }] },
  };

  const m3 = await prisma.market.upsert({
    where: { id: 'market-3' },
    update: {},
    create: {
      id: 'market-3',
      title: 'Will Ethereum reach $5k by end of 2026?',
      description: 'Ethereum price prediction for end of 2026',
      resolutionDescription: '',
      yesOrderBook: JSON.stringify(orderbook3_yes),
      noOrderBook: JSON.stringify(orderbook3_no),
      totalQty: 70,
    }
  });

  const orderbook4_yes = {
    '60': { availableQuantity: 35, orders: [{ userId: 'mm-7', quantity: 35 }] },
  };
  const orderbook4_no = {
    '35': { availableQuantity: 20, orders: [{ userId: 'mm-8', quantity: 20 }] },
    '40': { availableQuantity: 10, orders: [{ userId: 'retail-4', quantity: 10 }] }
  };

  const m4 = await prisma.market.upsert({
    where: { id: 'market-4' },
    update: {},
    create: {
      id: 'market-4',
      title: 'Will Tesla stock exceed $500 in 2026?',
      description: 'Tesla stock price prediction for 2026',
      resolutionDescription: '',
      yesOrderBook: JSON.stringify(orderbook4_yes),
      noOrderBook: JSON.stringify(orderbook4_no),
      totalQty: 65,
    }
  });

  const orderbook5_yes = {
    '25': { availableQuantity: 40, orders: [{ userId: 'mm-9', quantity: 40 }] },
  };
  const orderbook5_no = {
    '75': { availableQuantity: 25, orders: [{ userId: 'mm-10', quantity: 25 }] },
  };

  const m5 = await prisma.market.upsert({
    where: { id: 'market-5' },
    update: {},
    create: {
      id: 'market-5',
      title: 'Will AI pass the Turing test convincingly by 2027?',
      description: 'AI advancement prediction',
      resolutionDescription: '',
      yesOrderBook: JSON.stringify(orderbook5_yes),
      noOrderBook: JSON.stringify(orderbook5_no),
      totalQty: 65,
    }
  });

  const orderbook6_yes = {
    '70': { availableQuantity: 30, orders: [{ userId: 'mm-11', quantity: 30 }] },
  };
  const orderbook6_no = {
    '25': { availableQuantity: 45, orders: [{ userId: 'mm-12', quantity: 45 }] },
  };

  const m6 = await prisma.market.upsert({
    where: { id: 'market-6' },
    update: {},
    create: {
      id: 'market-6',
      title: 'Will SpaceX successfully land humans on Mars by 2030?',
      description: 'Space exploration milestone prediction',
      resolutionDescription: '',
      yesOrderBook: JSON.stringify(orderbook6_yes),
      noOrderBook: JSON.stringify(orderbook6_no),
      totalQty: 75,
    }
  });

  const orderbook7_yes = {
    '50': { availableQuantity: 20, orders: [{ userId: 'mm-13', quantity: 20 }] },
    '55': { availableQuantity: 15, orders: [{ userId: 'retail-5', quantity: 15 }] }
  };
  const orderbook7_no = {
    '45': { availableQuantity: 25, orders: [{ userId: 'mm-14', quantity: 25 }] },
  };

  const m7 = await prisma.market.upsert({
    where: { id: 'market-7' },
    update: {},
    create: {
      id: 'market-7',
      title: 'Will global average temperature rise above 1.5°C by 2028?',
      description: 'Climate change milestone prediction',
      resolutionDescription: '',
      yesOrderBook: JSON.stringify(orderbook7_yes),
      noOrderBook: JSON.stringify(orderbook7_no),
      totalQty: 60,
    }
  });

  const orderbook8_yes = {
    '80': { availableQuantity: 35, orders: [{ userId: 'mm-15', quantity: 35 }] },
  };
  const orderbook8_no = {
    '15': { availableQuantity: 20, orders: [{ userId: 'mm-16', quantity: 20 }] },
  };

  const m8 = await prisma.market.upsert({
    where: { id: 'market-8' },
    update: {},
    create: {
      id: 'market-8',
      title: 'Will a quantum computer solve a practical problem by 2027?',
      description: 'Quantum computing advancement prediction',
      resolutionDescription: '',
      yesOrderBook: JSON.stringify(orderbook8_yes),
      noOrderBook: JSON.stringify(orderbook8_no),
      totalQty: 55,
    }
  });

  const orderbook9_yes = {
    '35': { availableQuantity: 30, orders: [{ userId: 'mm-17', quantity: 30 }] },
  };
  const orderbook9_no = {
    '65': { availableQuantity: 40, orders: [{ userId: 'mm-18', quantity: 40 }] },
  };

  const m9 = await prisma.market.upsert({
    where: { id: 'market-9' },
    update: {},
    create: {
      id: 'market-9',
      title: 'Will Apple release AR glasses by 2027?',
      description: 'Consumer electronics product prediction',
      resolutionDescription: '',
      yesOrderBook: JSON.stringify(orderbook9_yes),
      noOrderBook: JSON.stringify(orderbook9_no),
      totalQty: 70,
    }
  });

  const orderbook10_yes = {
    '55': { availableQuantity: 25, orders: [{ userId: 'mm-19', quantity: 25 }] },
  };
  const orderbook10_no = {
    '40': { availableQuantity: 35, orders: [{ userId: 'mm-20', quantity: 35 }] },
  };

  const m10 = await prisma.market.upsert({
    where: { id: 'market-10' },
    update: {},
    create: {
      id: 'market-10',
      title: 'Will renewable energy exceed 50% of global electricity by 2030?',
      description: 'Energy transition milestone prediction',
      resolutionDescription: '',
      yesOrderBook: JSON.stringify(orderbook10_yes),
      noOrderBook: JSON.stringify(orderbook10_no),
      totalQty: 60,
    }
  });

  // Create a test user and some positions
  const user = await prisma.user.upsert({
    where: { address: 'test-address' },
    update: { usdBalance: 100000 },
    create: { address: 'test-address', usdBalance: 100000 }
  });

  // Ensure positions exist for test user
  await prisma.position.upsert({ where: { userId_marketId_type: { userId: user.id, marketId: m1.id, type: 'Yes' } }, update: { qty: 10 }, create: { userId: user.id, marketId: m1.id, type: 'Yes', qty: 10 } });
  await prisma.position.upsert({ where: { userId_marketId_type: { userId: user.id, marketId: m1.id, type: 'No' } }, update: { qty: 5 }, create: { userId: user.id, marketId: m1.id, type: 'No', qty: 5 } });

  // Create a couple of order history entries so frontend can show recent activity
  await prisma.orderHistory.createMany({ data: [
    { orderType: 'Buy', qty: 10, price: 20, userId: user.id, marketId: m1.id },
    { orderType: 'Sell', qty: 5, price: 70, userId: user.id, marketId: m1.id },
  ]});

  console.log('Seed complete.');
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => process.exit(0));
