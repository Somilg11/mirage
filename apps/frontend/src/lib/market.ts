import {
  Bitcoin,
  Clapperboard,
  Cpu,
  FlaskConical,
  Globe,
  Landmark,
  LineChart,
  Sparkles,
  Trophy,
  type LucideIcon,
} from 'lucide-react';
import type { BookLevel, MarketSummary, OrderBookResponse, Outcome } from '@repo/shared';

interface CategoryMeta {
  icon: LucideIcon;
  /** Tailwind classes for the icon tile. Literal strings so Tailwind can detect them. */
  tile: string;
}

const CATEGORY_META: Record<string, CategoryMeta> = {
  crypto: { icon: Bitcoin, tile: 'bg-amber-500/15 text-amber-500' },
  politics: { icon: Landmark, tile: 'bg-sky-500/15 text-sky-500' },
  tech: { icon: Cpu, tile: 'bg-violet-500/15 text-violet-500' },
  technology: { icon: Cpu, tile: 'bg-violet-500/15 text-violet-500' },
  science: { icon: FlaskConical, tile: 'bg-teal-500/15 text-teal-500' },
  economy: { icon: LineChart, tile: 'bg-emerald-500/15 text-emerald-500' },
  finance: { icon: LineChart, tile: 'bg-emerald-500/15 text-emerald-500' },
  sports: { icon: Trophy, tile: 'bg-orange-500/15 text-orange-500' },
  culture: { icon: Clapperboard, tile: 'bg-pink-500/15 text-pink-500' },
  world: { icon: Globe, tile: 'bg-indigo-500/15 text-indigo-500' },
};

const FALLBACK: CategoryMeta = { icon: Sparkles, tile: 'bg-primary-soft text-primary' };

export function categoryMeta(category: string): CategoryMeta {
  return CATEGORY_META[category.toLowerCase()] ?? FALLBACK;
}

export function outcomePrice(market: Pick<MarketSummary, 'yesPrice' | 'noPrice'>, outcome: Outcome) {
  return outcome === 'yes' ? market.yesPrice : market.noPrice;
}

export function bestAsk(book: OrderBookResponse | undefined, outcome: Outcome) {
  return book?.[outcome].asks[0]?.price ?? null;
}

export function bestBid(book: OrderBookResponse | undefined, outcome: Outcome) {
  return book?.[outcome].bids[0]?.price ?? null;
}

export interface MarketFillEstimate {
  shares: number;
  /** Cents spent (buy) or received (sell). */
  total: number;
  avgPrice: number | null;
  /** Least favourable level touched; used as the IOC limit price. */
  worstPrice: number | null;
  /** True when the book could absorb the whole request. */
  complete: boolean;
}

/** Walks asks to estimate how many shares a cash budget (cents) buys. */
export function estimateBuy(asks: BookLevel[], budgetCents: number): MarketFillEstimate {
  let remaining = budgetCents;
  let shares = 0;
  let worstPrice: number | null = null;
  let bookExhausted = true;
  for (const level of asks) {
    const take = Math.min(level.quantity, Math.floor(remaining / level.price));
    if (take > 0) {
      shares += take;
      remaining -= take * level.price;
      worstPrice = level.price;
    }
    if (take < level.quantity) {
      bookExhausted = false;
      break;
    }
  }
  const total = budgetCents - remaining;
  // Levels are ascending, so leftover cash below the last price could not buy more anyway.
  const lastPrice = asks.at(-1)?.price ?? 1;
  return {
    shares,
    total,
    avgPrice: shares ? total / shares : null,
    worstPrice,
    complete: !bookExhausted || remaining < lastPrice,
  };
}

/** Walks bids to estimate proceeds from selling a number of shares. */
export function estimateSell(bids: BookLevel[], shares: number): MarketFillEstimate {
  let remaining = shares;
  let total = 0;
  let worstPrice: number | null = null;
  for (const level of bids) {
    if (remaining <= 0) break;
    const take = Math.min(level.quantity, remaining);
    total += take * level.price;
    remaining -= take;
    worstPrice = level.price;
  }
  const filled = shares - remaining;
  return {
    shares: filled,
    total,
    avgPrice: filled ? total / filled : null,
    worstPrice,
    complete: remaining === 0,
  };
}

export function isTradable(market: Pick<MarketSummary, 'status'>) {
  return market.status === 'open';
}
