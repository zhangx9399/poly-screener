// Polymarket API types

export interface PolymarketMarket {
  id: string;
  question: string;
  slug: string;
  outcomes: string;        // JSON string: ["Yes", "No"]
  outcomePrices: string;   // JSON string: ["0.95", "0.05"]
  volume: string;
  volume24hr: number;
  volume1wk: number;
  liquidity: string;
  liquidityNum: number;
  endDate: string;
  startDate: string;
  active: boolean;
  closed: boolean;
  category: string;
  clobTokenIds: string;    // JSON string: ["tokenId1", "tokenId2"]
  negRisk: boolean;
  groupItemTitle: string;
  image: string;
  icon: string;
  bestBid: number;
  bestAsk: number;
  lastTradePrice: number;
  oneDayPriceChange: number;
}

export interface PolymarketEvent {
  id: string;
  title: string;
  slug: string;
  description: string;
  startDate: string;
  endDate: string;
  image: string;
  icon: string;
  active: boolean;
  closed: boolean;
  category: string;
  liquidity: number;
  volume: string;
  volume24hr: number;
  volume1wk: number;
  negRisk: boolean;
  enableNegRisk: boolean;
  negRiskAugmented: boolean;
  showAllOutcomes: boolean;
  markets: PolymarketMarket[];
  tags: { id: string; label: string; slug: string }[];
}

// Strategy 1 result: high certainty harvest
export interface StrategyOneItem {
  eventId: string;
  eventTitle: string;
  eventSlug: string;
  marketId: string;
  marketQuestion: string;
  marketSlug: string;
  yesPrice: number;         // 0-1
  endDate: string;
  daysRemaining: number;
  volume: number;
  volume24hr: number;
  liquidity: number;
  imageUrl: string;
  category: string;
}

// Strategy 2 result: strong competitor early entry
export interface StrategyTwoItem {
  eventId: string;
  eventTitle: string;
  eventSlug: string;
  topOptionName: string;
  topOptionPrice: number;     // 0-1
  topMarketId: string;
  topMarketSlug: string;
  secondOptionName: string;
  secondOptionPrice: number;  // 0-1
  leadMargin: number;         // percentage points (0-100)
  endDate: string;
  daysRemaining: number;
  volume: number;
  volume24hr: number;
  liquidity: number;
  imageUrl: string;
  category: string;
  clobTokenId: string;        // for fetching price history
  priceHistory?: PricePoint[];
}

export interface PricePoint {
  t: number;   // unix timestamp (seconds)
  p: number;   // price (0-1)
}

// Kelly criterion analysis for a single market
export interface KellyAnalysis {
  marketPrice: number;       // P — market price (0-1), the market's implied probability
  odds: number;              // b = (1-P)/P — profit per unit risked
  userProbability: number;   // p — user's estimated true probability (0-1)
  edge: number;              // bp - q — expected profit per $1 bet
  kellyFraction: number;     // edge / b, clamped to [0, 1] — optimal bet fraction
  recommendedBet: number;    // kellyFraction × bankroll
}

// Parsed market (after JSON.parse of string fields)
export interface ParsedMarket {
  id: string;
  question: string;
  slug: string;
  outcomes: string[];
  outcomePrices: number[];
  volume: number;
  volume24hr: number;
  liquidity: number;
  endDate: string;
  active: boolean;
  closed: boolean;
  category: string;
  clobTokenIds: string[];
  negRisk: boolean;
  groupItemTitle: string;
  image: string;
  icon: string;
}
