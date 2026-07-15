"use client";

import { StrategyOneItem } from "@/lib/types";
import { getPolymarketMarketUrl, calculateKelly } from "@/lib/polymarket";

function formatPrice(price: number): string {
  return `${(price * 100).toFixed(1)}¢`;
}

function formatVolume(vol: number): string {
  if (vol >= 1_000_000) return `$${(vol / 1_000_000).toFixed(2)}M`;
  if (vol >= 1_000) return `$${(vol / 1_000).toFixed(0)}K`;
  return `$${vol.toFixed(0)}`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatPercent(frac: number): string {
  return `${(frac * 100).toFixed(1)}%`;
}

function formatDollar(amt: number): string {
  if (amt >= 1000) return `$${(amt / 1000).toFixed(1)}K`;
  return `$${amt.toFixed(0)}`;
}

interface Props {
  items: StrategyOneItem[];
  bankroll: number;
  confidenceAdjust: number;
}

export default function StrategyOneTable({ items, bankroll, confidenceAdjust }: Props) {
  if (items.length === 0) {
    return (
      <div className="py-20 text-center text-gray-400">
        当前没有符合条件的事件
        <div className="mt-2 text-sm">
          筛选条件：Yes 90%-95% 且剩余 3-15 天
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left text-xs text-gray-500">
            <th className="pb-3 pr-4 font-medium">事件</th>
            <th className="pb-3 pr-4 font-medium text-right">Yes 概率</th>
            <th className="pb-3 pr-4 font-medium text-right">赔率 b</th>
            <th className="pb-3 pr-4 font-medium text-right">Edge</th>
            <th className="pb-3 pr-4 font-medium text-right">Kelly</th>
            <th className="pb-3 pr-4 font-medium text-right">建议下注</th>
            <th className="pb-3 pr-4 font-medium">到期日</th>
            <th className="pb-3 pr-4 font-medium text-right">剩余</th>
            <th className="pb-3 pr-4 font-medium text-right">交易量</th>
            <th className="pb-3 font-medium"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {items.map((item) => {
            const url = getPolymarketMarketUrl(item.eventSlug, item.marketSlug);
            const userProb = Math.min(0.999, item.yesPrice + confidenceAdjust / 100);
            const kelly = calculateKelly(item.yesPrice, userProb, bankroll);
            const hasEdge = kelly.edge > 0;

            return (
              <tr key={`${item.eventId}-${item.marketId}`} className="hover:bg-gray-50">
                <td className="py-3 pr-4">
                  <div className="flex items-start gap-3">
                    {item.imageUrl && (
                      <img
                        src={item.imageUrl}
                        alt=""
                        className="mt-0.5 h-8 w-8 flex-shrink-0 rounded object-cover"
                      />
                    )}
                    <div className="min-w-0">
                      <div className="font-medium text-gray-900 leading-snug">
                        {item.marketQuestion}
                      </div>
                      {item.eventTitle !== item.marketQuestion && (
                        <div className="mt-0.5 text-xs text-gray-400">
                          {item.eventTitle}
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="py-3 pr-4 text-right num font-semibold text-green-600">
                  {formatPrice(item.yesPrice)}
                </td>
                <td className="py-3 pr-4 text-right num text-gray-500">
                  {kelly.odds.toFixed(3)}
                </td>
                <td className={`py-3 pr-4 text-right num font-medium ${hasEdge ? "text-green-600" : "text-gray-300"}`}>
                  {kelly.edge >= 0 ? "+" : ""}{kelly.edge.toFixed(4)}
                </td>
                <td className={`py-3 pr-4 text-right num font-medium ${hasEdge ? "text-gray-900" : "text-gray-300"}`}>
                  {hasEdge ? formatPercent(kelly.kellyFraction) : "—"}
                </td>
                <td className={`py-3 pr-4 text-right num font-semibold ${hasEdge ? "text-indigo-600" : "text-gray-300"}`}>
                  {hasEdge ? formatDollar(kelly.recommendedBet) : "不建议"}
                </td>
                <td className="py-3 pr-4 num text-gray-600">
                  {formatDate(item.endDate)}
                </td>
                <td className="py-3 pr-4 text-right num">
                  <span className={`font-medium ${item.daysRemaining <= 5 ? "text-orange-600" : "text-gray-700"}`}>
                    {item.daysRemaining}天
                  </span>
                </td>
                <td className="py-3 pr-4 text-right num text-gray-600">
                  {formatVolume(item.volume)}
                </td>
                <td className="py-3">
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-md bg-gray-900 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-gray-700"
                  >
                    前往
                    <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </a>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
