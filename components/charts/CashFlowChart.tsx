'use client'

import { Card, Title, AreaChart, Text, Badge } from '@tremor/react'
import { CashFlow } from '@/types/financial'

interface CashFlowChartProps {
  data: CashFlow[]
}

export default function CashFlowChart({ data }: CashFlowChartProps) {
  const latestMonth = data[data.length - 1]
  const trend = latestMonth.netFlow > 0 ? 'positive' : 'negative'
  const avgNetFlow = data.reduce((sum, month) => sum + month.netFlow, 0) / data.length

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <div>
          <Title>Cash Flow Analysis</Title>
          <Text className="mt-1">Monthly income vs expenses over time</Text>
        </div>
        <Badge color={trend === 'positive' ? 'emerald' : 'rose'}>
          Avg: ${avgNetFlow.toFixed(0)}/mo
        </Badge>
      </div>
      
      <AreaChart
        className="h-72 mt-4"
        data={data}
        index="month"
        categories={["income", "expenses"]}
        colors={["emerald", "rose"]}
        valueFormatter={(value) => `$${value.toLocaleString()}`}
        showLegend={true}
        showGridLines={true}
        curveType="natural"
      />
      
      <div className="mt-4 grid grid-cols-3 gap-4">
        <div className="text-center">
          <Text className="text-xs text-gray-500">Latest Income</Text>
          <Text className="font-semibold text-emerald-600">
            ${latestMonth.income.toLocaleString()}
          </Text>
        </div>
        <div className="text-center">
          <Text className="text-xs text-gray-500">Latest Expenses</Text>
          <Text className="font-semibold text-rose-600">
            ${latestMonth.expenses.toLocaleString()}
          </Text>
        </div>
        <div className="text-center">
          <Text className="text-xs text-gray-500">Net Flow</Text>
          <Text className={`font-semibold ${latestMonth.netFlow > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {latestMonth.netFlow > 0 ? '+' : ''}${latestMonth.netFlow.toLocaleString()}
          </Text>
        </div>
      </div>
    </Card>
  )
}