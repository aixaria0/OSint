"use client";

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";

const COLORS: Record<string, string> = {
  malicious: "#ef4444",
  suspicious: "#f97316",
  harmless: "#22c55e",
  undetected: "#64748b",
};

interface Props {
  data: Record<string, number>;
}

export default function VTChart({ data }: Props) {
  const chartData = Object.entries(data)
    .filter(([k]) => k in COLORS && typeof data[k] === "number" && data[k] > 0)
    .map(([name, value]) => ({ name, value }));

  if (chartData.length === 0) return null;

  return (
    <div className="border border-green-950 bg-black/30 p-4">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-green-400">VirusTotal detection breakdown</h3>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
            {chartData.map((entry) => (
              <Cell key={entry.name} fill={COLORS[entry.name] || "#94a3b8"} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "8px", color: "#f1f5f9" }}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
