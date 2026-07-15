"use client";

import { PricePoint } from "@/lib/types";

interface MiniChartProps {
  data: PricePoint[];
  width?: number;
  height?: number;
  color?: string;
}

export default function MiniChart({
  data,
  width = 120,
  height = 36,
  color = "#6366f1",
}: MiniChartProps) {
  if (!data || data.length < 2) {
    return (
      <div
        className="inline-flex items-center text-xs text-gray-400"
        style={{ width, height }}
      >
        —
      </div>
    );
  }

  // Extract prices
  const prices = data.map((d) => d.p);
  const minP = Math.min(...prices);
  const maxP = Math.max(...prices);
  const range = maxP - minP || 1;

  // Normalize to chart coordinates
  const stepX = width / (data.length - 1);
  const points = data.map((d, i) => {
    const x = i * stepX;
    const y = height - ((d.p - minP) / range) * (height - 4) - 2;
    return `${x},${y}`;
  });

  const pathD = points.join(" L ");
  const areaD = `M 0,${height} L ${pathD} L ${width},${height} Z`;

  // Determine trend direction
  const firstPrice = prices[0];
  const lastPrice = prices[prices.length - 1];
  const isUp = lastPrice >= firstPrice;
  const trendColor = isUp ? "#16a34a" : "#dc2626";

  return (
    <svg width={width} height={height} className="inline-block">
      <path d={areaD} fill={trendColor} opacity={0.08} />
      <path
        d={`M ${pathD}`}
        fill="none"
        stroke={trendColor}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {/* start dot */}
      <circle cx={0} cy={height - ((prices[0] - minP) / range) * (height - 4) - 2} r={1.5} fill={trendColor} opacity={0.5} />
      {/* end dot */}
      <circle
        cx={width}
        cy={height - ((lastPrice - minP) / range) * (height - 4) - 2}
        r={2}
        fill={trendColor}
      />
    </svg>
  );
}
