"use client";

import { useState, useEffect, useCallback } from "react";
import {
  fetchActiveEvents,
  filterStrategyOne,
  filterStrategyTwo,
  batchFetchPriceHistory,
} from "@/lib/polymarket";
import { StrategyOneItem, StrategyTwoItem } from "@/lib/types";
import StrategyOneTable from "@/components/StrategyOneTable";
import StrategyTwoTable from "@/components/StrategyTwoTable";

type Tab = "strategy1" | "strategy2";

export default function Home() {
  const [tab, setTab] = useState<Tab>("strategy1");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [strategyOneData, setStrategyOneData] = useState<StrategyOneItem[]>([]);
  const [strategyTwoData, setStrategyTwoData] = useState<StrategyTwoItem[]>([]);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [bankroll, setBankroll] = useState(1000);
  const [confidenceAdjust, setConfidenceAdjust] = useState(3);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const events = await fetchActiveEvents();

      // Strategy 1: filter high certainty events
      const s1 = filterStrategyOne(events);
      setStrategyOneData(s1);

      // Strategy 2: filter strong competitor events
      const s2 = filterStrategyTwo(events);

      // Fetch price history for strategy 2 items (for trend charts)
      if (s2.length > 0) {
        const tokenIds = s2.map((item) => item.clobTokenId);
        const histories = await batchFetchPriceHistory(tokenIds, "1w");
        const s2WithHistory = s2.map((item) => ({
          ...item,
          priceHistory: histories[item.clobTokenId] || [],
        }));
        setStrategyTwoData(s2WithHistory);
      } else {
        setStrategyTwoData([]);
      }

      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "数据加载失败");
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      loadData();
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [autoRefresh, loadData]);

  const handleManualRefresh = () => {
    setLoading(true);
    loadData();
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-gray-100 bg-white/95 backdrop-blur">
        <div className="mx-auto max-w-6xl px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold text-gray-900">
                Polymarket 机会筛选器
              </h1>
              <p className="mt-0.5 text-xs text-gray-400">
                赚确定性上升的差价
              </p>
            </div>
            <div className="flex items-center gap-4">
              {lastUpdated && (
                <span className="text-xs text-gray-400">
                  更新于 {lastUpdated.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}
                </span>
              )}
              <label className="flex cursor-pointer items-center gap-1.5 text-xs text-gray-500">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="h-3 w-3 rounded accent-indigo-600"
                />
                自动刷新
              </label>
              <button
                onClick={handleManualRefresh}
                disabled={loading}
                className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
              >
                {loading ? (
                  <div className="spinner" style={{ width: 14, height: 14 }} />
                ) : (
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                )}
                刷新
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="mt-4 flex gap-6 border-b border-gray-100">
            <button
              onClick={() => setTab("strategy1")}
              className={`relative pb-2.5 text-sm font-medium transition-colors ${
                tab === "strategy1"
                  ? "text-gray-900"
                  : "text-gray-400 hover:text-gray-600"
              }`}
            >
              高确定性
              <span className="ml-1.5 text-xs text-gray-400 num">
                ({strategyOneData.length})
              </span>
              {tab === "strategy1" && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-900" />
              )}
            </button>
            <button
              onClick={() => setTab("strategy2")}
              className={`relative pb-2.5 text-sm font-medium transition-colors ${
                tab === "strategy2"
                  ? "text-gray-900"
                  : "text-gray-400 hover:text-gray-600"
              }`}
            >
              强者早期
              <span className="ml-1.5 text-xs text-gray-400 num">
                ({strategyTwoData.length})
              </span>
              {tab === "strategy2" && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-900" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-6xl px-6 py-6">
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
            <button
              onClick={handleManualRefresh}
              className="ml-2 underline"
            >
              重试
            </button>
          </div>
        )}

        {loading && strategyOneData.length === 0 && strategyTwoData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="spinner" />
            <p className="mt-3 text-sm text-gray-400">正在拉取 Polymarket 市场数据…</p>
          </div>
        ) : (
          <div key={tab} className="tab-content">
            {tab === "strategy1" ? (
              <>
                <div className="mb-3 text-xs text-gray-400">
                  筛选条件：财经/科技/经济事件 · Yes 90%-95% · 剩余 3-15 天 · 交易量 ≥ $1K
                </div>
                <div className="mb-4 flex flex-wrap items-center gap-4 rounded-lg border border-gray-100 bg-gray-50/50 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-gray-500">本金</label>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-gray-400">$</span>
                      <input
                        type="number"
                        value={bankroll}
                        onChange={(e) => setBankroll(Math.max(0, Number(e.target.value)))}
                        className="w-24 rounded border border-gray-200 px-2 py-1 text-sm text-gray-900 focus:border-gray-400 focus:outline-none"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-gray-500">信心调整</label>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">+{confidenceAdjust}%</span>
                      <input
                        type="range"
                        min={0}
                        max={10}
                        step={0.5}
                        value={confidenceAdjust}
                        onChange={(e) => setConfidenceAdjust(Number(e.target.value))}
                        className="w-32 accent-indigo-600"
                      />
                    </div>
                    <span className="text-xs text-gray-300">
                      市场价 +{confidenceAdjust}% = 你的估值
                    </span>
                  </div>
                </div>
                <StrategyOneTable
                  items={strategyOneData}
                  bankroll={bankroll}
                  confidenceAdjust={confidenceAdjust}
                />
              </>
            ) : (
              <>
                <div className="mb-3 text-xs text-gray-400">
                  筛选条件：财经/科技/经济事件 · 多选项 · 领先者 30-60% · 领先 ≥ 25% · 剩余 7-30 天
                </div>
                <StrategyTwoTable items={strategyTwoData} />
              </>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-4">
        <div className="mx-auto max-w-6xl px-6 text-center text-xs text-gray-300">
          数据来源 Polymarket · 仅供参考 · 非投资建议
        </div>
      </footer>
    </div>
  );
}
