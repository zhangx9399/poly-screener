import {
  PolymarketEvent,
  PolymarketMarket,
  ParsedMarket,
  StrategyOneItem,
  StrategyTwoItem,
  PricePoint,
} from "./types";

const GAMMA_API = "https://gamma-api.polymarket.com";
const CLOB_API = "https://clob.polymarket.com";

// ─── Helpers ──────────────────────────────────────────────

function safeParseJSON<T>(str: string | null | undefined, fallback: T): T {
  if (!str) return fallback;
  try {
    return JSON.parse(str) as T;
  } catch {
    return fallback;
  }
}

function parseMarket(m: PolymarketMarket): ParsedMarket {
  const outcomes = safeParseJSON<string[]>(m.outcomes, []);
  const outcomePrices = safeParseJSON<string[]>(m.outcomePrices, []).map((p) => parseFloat(p) || 0);
  const clobTokenIds = safeParseJSON<string[]>(m.clobTokenIds, []);

  return {
    id: m.id,
    question: m.question,
    slug: m.slug || "",
    outcomes,
    outcomePrices,
    volume: parseFloat(m.volume) || 0,
    volume24hr: m.volume24hr || 0,
    liquidity: parseFloat(m.liquidity) || 0,
    endDate: m.endDate,
    active: m.active,
    closed: m.closed,
    category: m.category || "",
    clobTokenIds,
    negRisk: m.negRisk,
    groupItemTitle: m.groupItemTitle || "",
    image: m.image || m.icon || "",
    icon: m.icon || "",
  };
}

function daysUntil(endDateStr: string): number {
  const now = new Date();
  const end = new Date(endDateStr);
  const ms = end.getTime() - now.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

function getYesPrice(market: ParsedMarket): number {
  // For binary markets: outcomes = ["Yes", "No"], outcomePrices = [yesPrice, noPrice]
  // For negRisk markets: same structure, [0] is Yes price
  if (market.outcomePrices.length >= 1) {
    return market.outcomePrices[0];
  }
  return 0;
}

function getMarketLabel(market: ParsedMarket): string {
  // For negRisk multi-outcome markets, use groupItemTitle (e.g., "Spain")
  if (market.groupItemTitle) return market.groupItemTitle;
  // For binary markets, use the question itself
  return market.question;
}

// ─── API: Fetch all active events ─────────────────────────

export async function fetchActiveEvents(): Promise<PolymarketEvent[]> {
  const allEvents: PolymarketEvent[] = [];
  let offset = 0;
  const limit = 100;
  let hasMore = true;

  // Use the events endpoint with pagination
  while (hasMore) {
    const params = new URLSearchParams({
      limit: String(limit),
      offset: String(offset),
      active: "true",
      closed: "false",
      order: "volume24hr",
      ascending: "false",
    });

    const url = `${GAMMA_API}/events?${params}`;
    const res = await fetch(url, { next: { revalidate: 300 } });

    if (!res.ok) {
      console.error(`Gamma API error: ${res.status} ${res.statusText}`);
      break;
    }

    const events: PolymarketEvent[] = await res.json();
    if (!Array.isArray(events) || events.length === 0) {
      hasMore = false;
      break;
    }

    allEvents.push(...events);
    offset += limit;

    // Safety cap: 1000 events (10 pages)
    if (events.length < limit || offset >= 1000) {
      hasMore = false;
    }
  }

  return allEvents;
}

// ─── Data-driven event scoring ─────────────────────────────
// Focus on Finance/Tech/Economy events with trackable real-world data
// (stock prices, market caps, economic indicators, AI/tech company events)

const INCLUSION_TAGS = new Set([
  "Finance", "Economy", "Economics", "Tech", "Technology", "AI",
  "Crypto", "Bitcoin", "Ethereum", "Big Tech", "Equities", "Stocks",
  "Earnings", "Fed", "GDP", "CPI", "Inflation", "Macro Indicators",
  "AI Rankings", "AI Releases", "Finance Updown", "Fed Rates",
  "Economic Policy", "Business", "XRP", "Ripple", "Solana",
  "CPI Release", "Core CPI", "Privates", "Anthropic", "OpenAI",
  "GPT-5", "Gemini", "google", "Elon Musk", "SpaceX", "Tesla",
]);

const EXCLUSION_TAGS = new Set([
  "Sports", "Soccer", "Tennis", "NBA", "NFL", "MLB", "NHL",
  "F1", "Formula 1", "Esports", "Dota 2", "CS2", "League of Legends",
  "FIFA World Cup", "Games", "Celebrities", "Music", "Entertainment",
  "TV Shows", "Reality TV", "Movies", "Olympics", "Boxing", "UFC",
  "MMA", "Cricket", "Golf", "Rugby", "NASCAR", "MLS",
  "Basketball", "Baseball", "Football", "Hockey", "World Cup Awards",
  "Major League Cricket", "Europa League",
]);

const INCLUSION_KEYWORDS = [
  "stock", "price", "market cap", "valuation", "earnings", "revenue",
  "ipo", "fed", "gdp", "inflation", "cpi", "interest rate", "tariff",
  "s&p 500", "nasdaq", "dow jones", "crude oil", "gold", "silver",
  "bitcoin", "ethereum", "nvidia", "apple", "microsoft", "tesla",
  "spacex", "amazon", "google", "meta", "anthropic", "openai",
  "ai model", "closing", "share", "index", "economy", "tech",
  "financial", "wti", "xauusd", "xagusd", "spy", "largest company",
  "best ai", "fed decision", "rate cut", "rate hike",
];

const EXCLUSION_PATTERNS = [
  /\bvs\.?\b/i, /\bspread:/i, /\bo\/u\b/i, /\bplayer props\b/i,
  /\bset \d+ winner\b/i, /\bitf\b/i, /\bwta\b/i, /\batp\b/i,
  /\bbo[35]\b/i, /\bgolden boot\b/i, /\bgolden ball\b/i,
  /\brookie of the year\b/i, /\bnext team\b/i, /\bexact score\b/i,
  /\bplayer prop\b/i, /\bgoalscorer\b/i,
];

/**
 * Check if an event is "data-driven" — belongs to Finance/Tech/Economy
 * and has trackable real-world data (stock prices, market caps, economic indicators).
 * Excludes Sports, Entertainment, and other unpredictable/random events.
 */
export function isDataDrivenEvent(event: PolymarketEvent): boolean {
  // Collect all tags (lowercase for comparison)
  const eventTags = (event.tags || []).map((t) => t.label);
  const eventTagsLower = eventTags.map((t) => t.toLowerCase());

  // HARD EXCLUSION: any exclusion tag present → reject
  for (const tag of eventTags) {
    if (EXCLUSION_TAGS.has(tag)) return false;
  }

  // Also check market-level categories for sports
  for (const m of event.markets || []) {
    const mCat = (m.category || "").toLowerCase();
    if (mCat === "sports") return false;
  }

  // Title-based exclusion patterns
  const titleLower = event.title.toLowerCase();
  for (const pattern of EXCLUSION_PATTERNS) {
    if (pattern.test(titleLower)) return false;
  }

  // Score inclusion tags
  let inclusionTagCount = 0;
  for (const tag of eventTags) {
    if (INCLUSION_TAGS.has(tag)) inclusionTagCount++;
  }

  // Score inclusion keywords in title
  let inclusionKeywordCount = 0;
  for (const kw of INCLUSION_KEYWORDS) {
    if (titleLower.includes(kw)) inclusionKeywordCount++;
  }

  // Pass criteria:
  // 1) Has ≥1 inclusion tag → accept
  // 2) Has ≥2 inclusion keywords in title → accept
  if (inclusionTagCount >= 1) return true;
  if (inclusionKeywordCount >= 2) return true;

  return false;
}

// ─── Strategy 1: High certainty harvest ───────────────────
// Data-driven events only (Finance/Tech/Economy) + 90% ≤ Yes ≤ 95% + 3-15 days + volume > $1K

export function filterStrategyOne(events: PolymarketEvent[]): StrategyOneItem[] {
  const results: StrategyOneItem[] = [];

  for (const event of events) {
    // ONLY data-driven events (Finance/Tech/Economy with trackable data)
    if (!isDataDrivenEvent(event)) continue;
    if (!event.markets || event.markets.length === 0) continue;

    for (const rawMarket of event.markets) {
      const market = parseMarket(rawMarket);
      if (!market.active || market.closed) continue;

      const yesPrice = getYesPrice(market);
      const days = daysUntil(market.endDate);

      // Filter: 90% ≤ Yes ≤ 95% AND 3-15 days to expiry AND volume > $1000
      if (
        yesPrice >= 0.90 &&
        yesPrice <= 0.95 &&
        days >= 3 &&
        days <= 15 &&
        market.volume > 1000
      ) {
        results.push({
          eventId: event.id,
          eventTitle: event.title,
          eventSlug: event.slug,
          marketId: market.id,
          marketQuestion: market.question,
          marketSlug: market.slug,
          yesPrice,
          endDate: market.endDate,
          daysRemaining: days,
          volume: market.volume,
          volume24hr: market.volume24hr,
          liquidity: market.liquidity,
          imageUrl: market.image || event.image || "",
          category: event.category || market.category || "",
        });
      }
    }
  }

  // Sort by Yes probability descending (highest certainty first)
  results.sort((a, b) => b.yesPrice - a.yesPrice);
  return results;
}

// ─── Strategy 2: Strong competitor early entry ────────────
// Multi-outcome events, top option 30-60%, leads #2 by ≥25pp, 7-30 days to expiry

export function filterStrategyTwo(events: PolymarketEvent[]): StrategyTwoItem[] {
  const results: StrategyTwoItem[] = [];

  for (const event of events) {
    // ONLY data-driven events (Finance/Tech/Economy with trackable data)
    if (!isDataDrivenEvent(event)) continue;

    // Must be a multi-outcome event (negRisk with multiple markets)
    if (!event.negRisk || !event.markets || event.markets.length < 3) continue;

    // Parse all markets and get their Yes prices
    const parsed = event.markets
      .map(parseMarket)
      .filter((m) => m.active && !m.closed);

    if (parsed.length < 3) continue;

    // Sort by Yes price descending
    const withPrices = parsed
      .map((m) => ({
        market: m,
        yesPrice: getYesPrice(m),
        label: getMarketLabel(m),
      }))
      .filter((x) => x.yesPrice > 0)
      .sort((a, b) => b.yesPrice - a.yesPrice);

    if (withPrices.length < 2) continue;

    const top = withPrices[0];
    const second = withPrices[1];

    // Check end date (use event endDate, fallback to market endDate)
    const endDate = event.endDate || top.market.endDate;
    const days = daysUntil(endDate);

    // Filter: top option 30-60%, leads by ≥25pp, 7-30 days
    if (
      top.yesPrice >= 0.30 &&
      top.yesPrice <= 0.60 &&
      (top.yesPrice - second.yesPrice) >= 0.25 &&
      days >= 7 &&
      days <= 30
    ) {
      const clobTokenId = top.market.clobTokenIds[0] || "";

      results.push({
        eventId: event.id,
        eventTitle: event.title,
        eventSlug: event.slug,
        topOptionName: top.label,
        topOptionPrice: top.yesPrice,
        topMarketId: top.market.id,
        topMarketSlug: top.market.slug,
        secondOptionName: second.label,
        secondOptionPrice: second.yesPrice,
        leadMargin: Math.round((top.yesPrice - second.yesPrice) * 100),
        endDate,
        daysRemaining: days,
        volume: parseFloat(event.volume) || 0,
        volume24hr: event.volume24hr || 0,
        liquidity: event.liquidity || 0,
        imageUrl: event.image || top.market.image || "",
        category: event.category || "",
        clobTokenId,
      });
    }
  }

  // Sort by lead margin descending
  results.sort((a, b) => b.leadMargin - a.leadMargin);
  return results;
}

// ─── Fetch price history for trend chart ──────────────────

export async function fetchPriceHistory(
  tokenId: string,
  interval: string = "1w"
): Promise<PricePoint[]> {
  if (!tokenId) return [];

  const params = new URLSearchParams({
    market: tokenId,
    interval,
    fidelity: "1",
  });

  const url = `${CLOB_API}/prices-history?${params}`;
  const res = await fetch(url, { next: { revalidate: 300 } });

  if (!res.ok) return [];

  const data = await res.json();
  return data.history || [];
}

// ─── Batch fetch price history ─────────────────────────────

export async function batchFetchPriceHistory(
  tokenIds: string[],
  interval: string = "1w"
): Promise<Record<string, PricePoint[]>> {
  const valid = tokenIds.filter((id) => id);
  if (valid.length === 0) return {};

  const result: Record<string, PricePoint[]> = {};

  // Fetch in parallel (max 5 at a time to avoid overload)
  const batchSize = 5;
  for (let i = 0; i < valid.length; i += batchSize) {
    const batch = valid.slice(i, i + batchSize);
    const promises = batch.map(async (tokenId) => {
      const history = await fetchPriceHistory(tokenId, interval);
      return { tokenId, history };
    });
    const results = await Promise.all(promises);
    for (const { tokenId, history } of results) {
      result[tokenId] = history;
    }
  }

  return result;
}

// ─── Polymarket URL helper ─────────────────────────────────

export function getPolymarketEventUrl(slug: string): string {
  return `https://polymarket.com/event/${slug}`;
}

export function getPolymarketMarketUrl(eventSlug: string, marketSlug: string): string {
  return `https://polymarket.com/event/${eventSlug}/${marketSlug}`;
}
