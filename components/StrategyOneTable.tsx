"use client";

import { StrategyOneItem } from "@/lib/types";
import { getPolymarketMarketUrl } from "@/lib/polymarket";

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

export default function StrategyOneTable({ items }: { items: StrategyOneItem[] }) {
  if (items.length === 0) {
    return (
      <div className="py-20 text-center text-gray-400">
        当前没有符合条件的事件
        <div className="mt-2 text-sm">
          筛选条件：Yes 90%-95% 且剩余 3-10 天
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
            <th className="pb-3 pr-4 font-medium">到期日</th>
            <th className="pb-3 pr-4 font-medium text-right">剩余天数</th>
            <th className="pb-3 pr-4 font-medium text-right">交易量</th>
            <th className="pb-3 pr-4 font-medium text-right">流动性</th>
            <th className="pb-3 font-medium"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {items.map((item, i) => {
            const url = getPolymarketMarketUrl(item.eventSlug, item.marketSlug);
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
                <td className="py-3 pr-4 text-right num text-gray-600">
                  {formatVolume(item.liquidity)}
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
