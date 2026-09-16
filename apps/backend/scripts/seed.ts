/**
 * Seeds demo markets with synthetic price history and a resting liquidity ladder.
 *
 *   bun run db:seed
 *
 * Idempotent per market slug: existing markets are left untouched.
 * History is written directly (backdated); resting orders go through the real
 * order service so escrow and book state stay consistent.
 */
import 'dotenv/config';
import { SHARE_PAYOUT_CENTS } from '@repo/shared';
import { prisma, type Prisma } from 'db';
import { resolveMarket } from '../src/services/admin';
import { placeOrder } from '../src/services/orders';
import { DAY_MS } from '../src/lib/time';

interface SeedMarket {
  slug: string;
  title: (end: Date) => string;
  description: string;
  rules: string;
  category: string;
  /** Days from now until trading ends (negative for markets that already ended). */
  endsInDays: number;
  startPrice: number;
  drift: number;
  resolveTo?: 'yes' | 'no';
}

const MARKET_MAKERS = ['seed-market-maker-1', 'seed-market-maker-2'] as const;
const MARKET_MAKER_BALANCE = 50_000_000;
const HISTORY_DAYS = 30;

const monthYear = (d: Date) => d.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });

const MARKETS: SeedMarket[] = [
  {
    slug: 'bitcoin-above-150k',
    title: end => `Will Bitcoin trade above $150,000 by ${monthYear(end)}?`,
    description: 'Tracks whether BTC/USD prints above $150,000 on a major spot exchange before the market closes.',
    rules:
      'Resolves YES if the BTC/USD 1-minute candle close on Coinbase exceeds $150,000.00 at any time before the end date. Otherwise resolves NO.',
    category: 'Crypto',
    endsInDays: 200,
    startPrice: 38,
    drift: 0.08,
  },
  {
    slug: 'ethereum-above-10k',
    title: end => `Will Ethereum reach $10,000 by ${monthYear(end)}?`,
    description: 'Will ETH/USD hit a new all-time high above $10,000 before the end date?',
    rules: 'Resolves YES if the ETH/USD 1-minute candle close on Coinbase reaches $10,000.00 before the end date.',
    category: 'Crypto',
    endsInDays: 260,
    startPrice: 21,
    drift: -0.05,
  },
  {
    slug: 'fed-rate-cut-next-meeting',
    title: () => 'Will the Fed cut interest rates at its next FOMC meeting?',
    description: 'The Federal Open Market Committee sets the target range for the federal funds rate.',
    rules:
      'Resolves YES if the FOMC statement released after the next scheduled meeting lowers the upper bound of the target range. Resolves NO for a hold or hike.',
    category: 'Economy',
    endsInDays: 42,
    startPrice: 55,
    drift: 0.12,
  },
  {
    slug: 'us-cpi-below-2-5',
    title: () => 'Will the next US CPI report show inflation below 2.5%?',
    description: 'Year-over-year headline CPI as published by the Bureau of Labor Statistics.',
    rules:
      'Resolves YES if the headline CPI-U 12-month change in the next BLS release is below 2.5%, using the first published figure.',
    category: 'Economy',
    endsInDays: 28,
    startPrice: 44,
    drift: -0.1,
  },
  {
    slug: 'foldable-iphone-announced',
    title: end => `Will Apple announce a foldable iPhone by ${monthYear(end)}?`,
    description: 'Rumors of a foldable iPhone have circulated for years. Will Apple make it official?',
    rules:
      'Resolves YES if Apple officially announces an iPhone with a folding display via press release or keynote before the end date.',
    category: 'Tech',
    endsInDays: 150,
    startPrice: 30,
    drift: 0.06,
  },
  {
    slug: 'ai-imo-gold',
    title: end => `Will an AI system score gold at the IMO by ${monthYear(end)}?`,
    description: "The International Mathematical Olympiad is the world's premier high-school math competition.",
    rules:
      'Resolves YES if an AI system is credibly reported, under official IMO problems and time limits, to achieve a gold-medal score before the end date.',
    category: 'Tech',
    endsInDays: 300,
    startPrice: 62,
    drift: 0.04,
  },
  {
    slug: 'starship-orbital-flight',
    title: end => `Will Starship complete a full orbital flight by ${monthYear(end)}?`,
    description: "SpaceX's Starship is the largest rocket ever flown.",
    rules:
      'Resolves YES if a Starship vehicle completes at least one full orbit of Earth, as confirmed by SpaceX or a reputable tracking source, before the end date.',
    category: 'Science',
    endsInDays: 180,
    startPrice: 66,
    drift: 0.03,
  },
  {
    slug: 'hottest-year-on-record',
    title: () => 'Will this year be the hottest on record?',
    description: 'Global mean surface temperature compared against all prior years in the instrumental record.',
    rules:
      'Resolves YES if NASA GISS reports this calendar year as the warmest year in its GISTEMP record in its annual summary.',
    category: 'Science',
    endsInDays: 110,
    startPrice: 57,
    drift: 0.02,
  },
  {
    slug: 'midterm-turnout-60',
    title: () => 'Will turnout exceed 60% in the next US midterm election?',
    description: 'Voting-eligible population turnout in the upcoming midterm elections.',
    rules:
      'Resolves YES if the US Elections Project reports voting-eligible population turnout above 60.0% for the next midterm election.',
    category: 'Politics',
    endsInDays: 60,
    startPrice: 24,
    drift: -0.02,
  },
  {
    slug: 'senate-control-flips',
    title: () => 'Will control of the US Senate change hands after the midterms?',
    description: 'Which party will hold the Senate majority when the next Congress convenes?',
    rules:
      'Resolves YES if the party holding the Senate majority when the next Congress convenes differs from the current majority party.',
    category: 'Politics',
    endsInDays: 75,
    startPrice: 35,
    drift: 0.07,
  },
  {
    slug: 'champions-league-defending-champion',
    title: () => 'Will the defending champion win the next Champions League final?',
    description: "Back-to-back titles are rare in Europe's top club competition.",
    rules: 'Resolves YES if the current UEFA Champions League holders win the next final.',
    category: 'Sports',
    endsInDays: 250,
    startPrice: 13,
    drift: -0.01,
  },
  {
    slug: 'sequel-tops-box-office',
    title: () => "Will a sequel be this year's highest-grossing film worldwide?",
    description: 'Franchise films have dominated the global box office for a decade.',
    rules:
      'Resolves YES if the highest-grossing film of the calendar year worldwide, per Box Office Mojo on January 15, is a sequel.',
    category: 'Culture',
    endsInDays: 105,
    startPrice: 74,
    drift: 0.01,
  },
  {
    slug: 'sp500-higher-last-quarter',
    title: () => 'Did the S&P 500 finish last quarter higher?',
    description: 'Quarter-over-quarter change in the S&P 500 index close.',
    rules: "Resolves YES if the S&P 500 closed the last trading day of the quarter above the prior quarter's close.",
    category: 'Economy',
    endsInDays: -5,
    startPrice: 52,
    drift: 0.15,
    resolveTo: 'yes',
  },
];

/** Small deterministic PRNG so seeded charts look the same on every machine. */
function createRandom(seedText: string) {
  let state = [...seedText].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 2166136261);
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

async function ensureMarketMakers() {
  const users = [];
  for (const address of MARKET_MAKERS) {
    users.push(
      await prisma.user.upsert({
        where: { address },
        update: {},
        create: { address, usdBalance: MARKET_MAKER_BALANCE },
      }),
    );
  }
  return users as [(typeof users)[0], (typeof users)[0]];
}

async function seedHistory(def: SeedMarket, marketId: string, makers: readonly [string, string], now: number) {
  const random = createRandom(def.slug);
  const start = now - HISTORY_DAYS * DAY_MS;
  const historyEnd = def.endsInDays < 0 ? now + def.endsInDays * DAY_MS : now;
  const tradeCount = 80 + Math.floor(random() * 60);

  const orders: Prisma.OrderCreateManyInput[] = [];
  const trades: Prisma.TradeCreateManyInput[] = [];
  const holdings = new Map<string, { userId: string; outcome: 'Yes' | 'No'; qty: number; cost: number }>();
  const spentByUser = new Map<string, number>();
  let volume = 0;
  let price = def.startPrice;

  const hold = (userId: string, outcome: 'Yes' | 'No', qty: number, unitPrice: number) => {
    const key = `${userId}:${outcome}`;
    const entry = holdings.get(key) ?? { userId, outcome, qty: 0, cost: 0 };
    entry.qty += qty;
    entry.cost += unitPrice * qty;
    holdings.set(key, entry);
    spentByUser.set(userId, (spentByUser.get(userId) ?? 0) + unitPrice * qty);
  };

  for (let i = 0; i < tradeCount; i++) {
    const createdAt = new Date(start + ((historyEnd - start) * (i + random() * 0.8)) / tradeCount);
    // Mean-reverting random walk around a drifting anchor keeps charts plausible.
    const anchor = def.startPrice + def.drift * i;
    price = Math.round(clamp(price + (random() - 0.5) * 5 + (anchor - price) * 0.08, 4, 96));
    const quantity = 5 + Math.floor(random() ** 2 * 400);
    const noPrice = SHARE_PAYOUT_CENTS - price;

    // Every historical trade mints a pair: one maker buys YES, the other buys NO.
    const [yesUser, noUser] = random() < 0.5 ? makers : ([makers[1], makers[0]] as const);
    const yesIsTaker = random() < 0.5;
    const yesOrderId = crypto.randomUUID();
    const noOrderId = crypto.randomUUID();
    const common = { marketId, quantity, filledQuantity: quantity, status: 'Filled' as const, createdAt };
    orders.push(
      {
        ...common,
        id: yesOrderId,
        userId: yesUser,
        outcome: 'Yes',
        side: 'Buy',
        bookSide: 'Bid',
        price,
        yesPrice: price,
      },
      {
        ...common,
        id: noOrderId,
        userId: noUser,
        outcome: 'No',
        side: 'Buy',
        bookSide: 'Ask',
        price: noPrice,
        yesPrice: price,
      },
    );
    trades.push({
      marketId,
      makerOrderId: yesIsTaker ? noOrderId : yesOrderId,
      takerOrderId: yesIsTaker ? yesOrderId : noOrderId,
      yesPrice: price,
      quantity,
      takerOutcome: yesIsTaker ? 'Yes' : 'No',
      takerSide: 'Buy',
      createdAt,
    });

    volume += (yesIsTaker ? price : noPrice) * quantity;
    hold(yesUser, 'Yes', quantity, price);
    hold(noUser, 'No', quantity, noPrice);
  }

  await prisma.order.createMany({ data: orders });
  await prisma.trade.createMany({ data: trades });
  for (const { userId, outcome, qty, cost } of holdings.values()) {
    await prisma.position.upsert({
      where: { userId_marketId_outcome: { userId, marketId, outcome } },
      create: { userId, marketId, outcome, qty, costBasis: cost },
      update: { qty: { increment: qty }, costBasis: { increment: cost } },
    });
  }
  for (const [userId, spent] of spentByUser) {
    await prisma.user.update({ where: { id: userId }, data: { usdBalance: { decrement: spent } } });
  }
  await prisma.market.update({ where: { id: marketId }, data: { volume, lastPrice: price } });
  return price;
}

async function seedLadder(def: SeedMarket, marketId: string, makers: readonly [string, string], price: number) {
  const random = createRandom(`${def.slug}:ladder`);
  const size = () => 25 + Math.floor(random() * 350);

  for (let step = 1; step <= 6; step++) {
    const bid = price - step;
    const ask = price + step;
    if (bid >= 1) {
      await placeOrder(makers[0], {
        marketId,
        outcome: 'yes',
        side: 'buy',
        price: bid,
        quantity: size(),
        timeInForce: 'GTC',
      });
    }
    if (ask <= 99) {
      await placeOrder(makers[1], {
        marketId,
        outcome: 'no',
        side: 'buy',
        price: SHARE_PAYOUT_CENTS - ask,
        quantity: size(),
        timeInForce: 'GTC',
      });
    }
  }
  // Some asks backed by inventory rather than cash.
  if (price + 2 <= 99) {
    await placeOrder(makers[0], {
      marketId,
      outcome: 'yes',
      side: 'sell',
      price: price + 2,
      quantity: size(),
      timeInForce: 'GTC',
    });
  }
}

async function main() {
  if (process.env.NODE_ENV === 'production' && !process.argv.includes('--force')) {
    throw new Error('Refusing to seed with NODE_ENV=production (pass --force to override)');
  }

  const now = Date.now();
  const [mm1, mm2] = await ensureMarketMakers();
  const makers = [mm1.id, mm2.id] as const;
  let created = 0;

  for (const def of MARKETS) {
    if (await prisma.market.findUnique({ where: { slug: def.slug } })) continue;

    const endDate = new Date(now + def.endsInDays * DAY_MS);
    const market = await prisma.market.create({
      data: {
        slug: def.slug,
        title: def.title(endDate),
        description: def.description,
        rules: def.rules,
        category: def.category,
        endDate,
        createdAt: new Date(now - (HISTORY_DAYS + 2) * DAY_MS),
      },
    });

    const price = await seedHistory(def, market.id, makers, now);
    if (def.resolveTo) {
      await resolveMarket(market.id, { outcome: def.resolveTo });
    } else {
      await seedLadder(def, market.id, makers, price);
    }
    created += 1;
    console.log(`seeded ${def.slug} @ ${price}¢`);
  }

  console.log(created === 0 ? 'Nothing to seed; markets already exist.' : `Seeded ${created} markets.`);
}

main()
  .catch((err: unknown) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
