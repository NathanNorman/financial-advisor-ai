'use client'

import { Card, Title, DonutChart, Text, Badge, List, ListItem, Flex, ProgressBar } from '@tremor/react'
import { BudgetAllocation } from '@/types/financial'

interface BudgetAllocationChartProps {
  allocation: BudgetAllocation
  monthlyIncome: number
}

export default function BudgetAllocationChart({ allocation, monthlyIncome }: BudgetAllocationChartProps) {
  const budgetData = [
    { 
      name: 'Needs (50%)', 
      value: allocation.actual.needs,
      target: allocation.needs,
      amount: (monthlyIncome * allocation.actual.needs) / 100
    },
    { 
      name: 'Wants (30%)', 
      value: allocation.actual.wants,
      target: allocation.wants,
      amount: (monthlyIncome * allocation.actual.wants) / 100
    },
    { 
      name: 'Savings (20%)', 
      value: allocation.actual.savings,
      target: allocation.savings,
      amount: (monthlyIncome * allocation.actual.savings) / 100
    },
  ]

  const isOnTrack = Math.abs(allocation.actual.needs - allocation.needs) <= 5 &&
                    Math.abs(allocation.actual.wants - allocation.wants) <= 5 &&
                    Math.abs(allocation.actual.savings - allocation.savings) <= 5

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <div>
          <Title>Budget Allocation (50/30/20 Rule)</Title>
          <Text className="mt-1">How your spending aligns with recommended budget</Text>
        </div>
        <Badge color={isOnTrack ? 'emerald' : 'amber'}>
          {isOnTrack ? 'On Track' : 'Needs Adjustment'}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DonutChart
          className="h-48"
          data={budgetData}
          category="value"
          index="name"
          colors={['blue', 'amber', 'emerald']}
          valueFormatter={(value) => `${value}%`}
          showLabel={true}
        />

        <div>
          <Text className="font-semibold mb-3">Budget Breakdown</Text>
          <List>
            {budgetData.map((category, index) => (
              <ListItem key={index}>
                <Flex justifyContent="between" className="mb-2">
                  <Text className="text-sm">{category.name}</Text>
                  <Text className="text-sm font-medium">
                    ${category.amount.toLocaleString()}
                  </Text>
                </Flex>
                <ProgressBar
                  value={(category.value / category.target) * 100}
                  color={
                    category.value <= category.target ? 'emerald' : 
                    category.value <= category.target + 5 ? 'amber' : 'rose'
                  }
                  className="mt-1"
                />
                <Flex justifyContent="between" className="mt-1">
                  <Text className="text-xs text-gray-500">
                    Actual: {category.value}%
                  </Text>
                  <Text className="text-xs text-gray-500">
                    Target: {category.target}%
                  </Text>
                </Flex>
              </ListItem>
            ))}
          </List>
        </div>
      </div>

      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
        <Text className="text-sm">
          <span className="font-semibold">💡 Tip:</span> The 50/30/20 rule suggests spending 
          50% on needs, 30% on wants, and saving 20% of your after-tax income.
        </Text>
      </div>
    </Card>
  )
}