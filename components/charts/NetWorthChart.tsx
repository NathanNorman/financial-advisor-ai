'use client'

import { Card, Title, LineChart, Text, Badge, Metric } from '@tremor/react'
import { NetWorthSnapshot } from '@/types/financial'
import { format } from 'date-fns'

interface NetWorthChartProps {
  data: NetWorthSnapshot[]
}

export default function NetWorthChart({ data }: NetWorthChartProps) {
  const formattedData = data.map(snapshot => ({
    month: format(snapshot.date, 'MMM'),
    Assets: snapshot.assets,
    Liabilities: snapshot.liabilities,
    'Net Worth': snapshot.netWorth
  }))

  const latestSnapshot = data[data.length - 1]
  const firstSnapshot = data[0]
  const growthAmount = latestSnapshot.netWorth - firstSnapshot.netWorth
  const growthPercentage = ((growthAmount / firstSnapshot.netWorth) * 100).toFixed(1)

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <div>
          <Title>Net Worth Progression</Title>
          <Text className="mt-1">Assets, liabilities, and net worth over time</Text>
        </div>
        <Badge color={growthAmount > 0 ? 'emerald' : 'rose'}>
          {growthAmount > 0 ? '+' : ''}{growthPercentage}%
        </Badge>
      </div>
      
      <div className="mb-4">
        <Metric className="text-2xl">${latestSnapshot.netWorth.toLocaleString()}</Metric>
        <Text className="text-sm text-gray-500">
          {growthAmount > 0 ? '↑' : '↓'} ${Math.abs(growthAmount).toLocaleString()} from start
        </Text>
      </div>
      
      <LineChart
        className="h-64"
        data={formattedData}
        index="month"
        categories={['Assets', 'Liabilities', 'Net Worth']}
        colors={['emerald', 'rose', 'indigo']}
        valueFormatter={(value) => `$${(value / 1000).toFixed(1)}k`}
        showLegend={true}
        showGridLines={true}
        curveType="natural"
      />
      
      <div className="mt-4 grid grid-cols-3 gap-4">
        <div className="text-center">
          <Text className="text-xs text-gray-500">Total Assets</Text>
          <Text className="font-semibold text-emerald-600">
            ${(latestSnapshot.assets / 1000).toFixed(1)}k
          </Text>
        </div>
        <div className="text-center">
          <Text className="text-xs text-gray-500">Total Liabilities</Text>
          <Text className="font-semibold text-rose-600">
            ${(latestSnapshot.liabilities / 1000).toFixed(1)}k
          </Text>
        </div>
        <div className="text-center">
          <Text className="text-xs text-gray-500">Asset/Debt Ratio</Text>
          <Text className="font-semibold text-indigo-600">
            {(latestSnapshot.assets / latestSnapshot.liabilities).toFixed(2)}x
          </Text>
        </div>
      </div>
    </Card>
  )
}