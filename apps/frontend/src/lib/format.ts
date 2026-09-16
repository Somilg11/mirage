const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const usdCompact = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  notation: 'compact',
  maximumFractionDigits: 1,
});
const integer = new Intl.NumberFormat('en-US');

/** 12345 cents -> "$123.45" */
export function formatUsd(cents: number) {
  return usd.format(cents / 100);
}

/** 123456789 cents -> "$1.2M" */
export function formatUsdCompact(cents: number) {
  if (Math.abs(cents) < 100_000) return usd.format(cents / 100).replace(/\.00$/, '');
  return usdCompact.format(cents / 100);
}

export function formatSignedUsd(cents: number) {
  const sign = cents > 0 ? '+' : cents < 0 ? '−' : '';
  return `${sign}${usd.format(Math.abs(cents) / 100)}`;
}

/** 62 -> "62¢", 62.456 -> "62.5¢" */
export function formatCents(price: number | null | undefined) {
  if (price == null) return '—';
  return `${Number.isInteger(price) ? price : price.toFixed(1)}¢`;
}

/** YES price in cents -> probability label. */
export function formatProbability(price: number | null | undefined) {
  if (price == null) return '—';
  if (price > 0 && price < 1) return '<1%';
  if (price < 100 && price > 99) return '>99%';
  return `${Math.round(price)}%`;
}

export function formatShares(qty: number) {
  return integer.format(qty);
}

export function formatDate(
  iso: string,
  opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' },
) {
  return new Date(iso).toLocaleDateString('en-US', opts);
}

export function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
const DIVISIONS: [number, Intl.RelativeTimeFormatUnit][] = [
  [60, 'second'],
  [60, 'minute'],
  [24, 'hour'],
  [7, 'day'],
  [4.34524, 'week'],
  [12, 'month'],
  [Number.POSITIVE_INFINITY, 'year'],
];

export function formatRelative(iso: string, now = Date.now()) {
  let duration = (new Date(iso).getTime() - now) / 1000;
  for (const [amount, unit] of DIVISIONS) {
    if (Math.abs(duration) < amount) return rtf.format(Math.round(duration), unit);
    duration /= amount;
  }
  return formatDate(iso);
}

export function formatCountdown(ms: number) {
  if (ms <= 0) return '0s';
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function shortAddress(address: string, chars = 4) {
  if (address.length <= chars * 2 + 3) return address;
  return `${address.slice(0, chars)}…${address.slice(-chars)}`;
}
