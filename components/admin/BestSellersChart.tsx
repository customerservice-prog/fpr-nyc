'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

interface BestSellersChartProps {
  data: Array<{ name: string; count: number }>
}

export default function BestSellersChart({ data }: BestSellersChartProps) {
  if (!data.length) {
    return (
      <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
        No booking data yet
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} layout="vertical" margin={{ left: 80, right: 20 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis type="number" />
        <YAxis type="category" dataKey="name" width={75} tick={{ fontSize: 11 }} />
        <Tooltip />
        <Bar dataKey="count" fill="#2d6a2d" />
      </BarChart>
    </ResponsiveContainer>
  )
}
