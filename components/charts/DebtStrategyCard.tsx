'use client'

import { Card, Title, Text, Badge, List, ListItem, BarChart, Flex, Button } from '@tremor/react'
import { Debt } from '@/types/financial'
import { useState } from 'react'
import { ChevronRightIcon, SparklesIcon } from '@heroicons/react/24/outline'

interface DebtStrategyCardProps {
  debts: Debt[]
}

export default function DebtStrategyCard({ debts }: DebtStrategyCardProps) {
  const [strategy, setStrategy] = useState<'avalanche' | 'snowball'>('avalanche')
  
  const sortedDebts = [...debts].sort((a, b) => {
    if (strategy === 'avalanche') {
      return b.interestRate - a.interestRate
    } else {
      return a.balance - b.balance
    }
  })

  const totalDebt = debts.reduce((sum, debt) => sum + debt.balance, 0)
  const totalMinimumPayment = debts.reduce((sum, debt) => sum + debt.minimumPayment, 0)
  const weightedAPR = debts.reduce((sum, debt) => sum + (debt.interestRate * debt.balance), 0) / totalDebt

  const debtChartData = sortedDebts.map((debt, index) => ({
    name: debt.name,
    'Balance': debt.balance,
    'Interest Rate': debt.interestRate,
    priority: index + 1,
  }))

  const calculatePayoffTime = (debt: Debt, extraPayment: number = 0) => {
    const monthlyRate = debt.interestRate / 100 / 12
    const payment = debt.minimumPayment + extraPayment
    if (payment <= debt.balance * monthlyRate) return Infinity
    const months = Math.log(payment / (payment - debt.balance * monthlyRate)) / Math.log(1 + monthlyRate)
    return Math.ceil(months)
  }

  const extraPayment = 500 // Assume $500 extra per month for calculations
  let remainingExtra = extraPayment
  const payoffPlan = sortedDebts.map((debt, index) => {
    const extra = index === 0 ? remainingExtra : 0
    const months = calculatePayoffTime(debt, extra)
    return {
      debt,
      payoffOrder: index + 1,
      monthsToPayoff: months,
      extraPayment: extra,
    }
  })

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <SparklesIcon className="w-6 h-6 text-purple-600" />
          <div>
            <Title>Debt Elimination Strategy</Title>
            <Text className="mt-1">Optimize your debt payoff plan</Text>
          </div>
        </div>
        <Badge color="purple">
          Total: ${totalDebt.toLocaleString()}
        </Badge>
      </div>

      <div className="mb-6">
        <div className="flex gap-2 mb-4">
          <Button
            size="xs"
            variant={strategy === 'avalanche' ? 'primary' : 'secondary'}
            onClick={() => setStrategy('avalanche')}
          >
            Avalanche (High Interest First)
          </Button>
          <Button
            size="xs"
            variant={strategy === 'snowball' ? 'primary' : 'secondary'}
            onClick={() => setStrategy('snowball')}
          >
            Snowball (Smallest Balance First)
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
          <div>
            <Text className="text-sm text-gray-600">Total Debt</Text>
            <Text className="font-semibold text-lg">${totalDebt.toLocaleString()}</Text>
          </div>
          <div>
            <Text className="text-sm text-gray-600">Avg Interest Rate</Text>
            <Text className="font-semibold text-lg">{weightedAPR.toFixed(2)}%</Text>
          </div>
          <div>
            <Text className="text-sm text-gray-600">Min. Payment</Text>
            <Text className="font-semibold text-lg">${totalMinimumPayment}/mo</Text>
          </div>
        </div>

        <BarChart
          className="h-48 mb-4"
          data={debtChartData}
          index="name"
          categories={['Balance']}
          colors={['rose']}
          valueFormatter={(value) => `$${value.toLocaleString()}`}
          showLegend={false}
        />

        <div>
          <Text className="font-semibold mb-3">
            Recommended Payoff Order ({strategy === 'avalanche' ? 'Highest Interest First' : 'Smallest Balance First'})
          </Text>
          <List>
            {payoffPlan.map((item, index) => (
              <ListItem key={index}>
                <div className="w-full">
                  <Flex justifyContent="between" className="mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-purple-600 text-white flex items-center justify-center text-xs font-bold">
                        {item.payoffOrder}
                      </div>
                      <div>
                        <Text className="font-medium">{item.debt.name}</Text>
                        <Text className="text-xs text-gray-500">
                          ${item.debt.balance.toLocaleString()} @ {item.debt.interestRate}% APR
                        </Text>
                      </div>
                    </div>
                    <div className="text-right">
                      <Text className="text-sm font-medium">
                        {item.monthsToPayoff === Infinity ? '∞' : `${item.monthsToPayoff} months`}
                      </Text>
                      <Text className="text-xs text-gray-500">
                        Pay ${item.debt.minimumPayment + item.extraPayment}/mo
                      </Text>
                    </div>
                  </Flex>
                </div>
              </ListItem>
            ))}
          </List>
        </div>

        <div className="mt-4 p-3 bg-purple-50 rounded-lg">
          <Text className="text-sm">
            <span className="font-semibold">💡 Strategy:</span> The {strategy} method 
            {strategy === 'avalanche' 
              ? ' saves the most money by targeting high-interest debt first.' 
              : ' provides psychological wins by eliminating smaller debts quickly.'}
          </Text>
        </div>

        <div className="mt-4 p-3 bg-emerald-50 rounded-lg">
          <Text className="text-sm">
            <span className="font-semibold">🎯 Pro Tip:</span> Adding just ${extraPayment}/month 
            to your debt payments could save thousands in interest and years of payments!
          </Text>
        </div>
      </div>
    </Card>
  )
}