'use client'

import { Card, Title, Text, Flex, Grid, ProgressBar, Badge, Metric } from '@tremor/react'
import { 
  BanknotesIcon, 
  ChartBarIcon, 
  FireIcon, 
  ShieldCheckIcon,
  ArrowTrendingUpIcon,
  CalculatorIcon
} from '@heroicons/react/24/outline'
import CashFlowChart from '@/components/charts/CashFlowChart'
import NetWorthChart from '@/components/charts/NetWorthChart'
import DebtStrategyCard from '@/components/charts/DebtStrategyCard'
import BudgetAllocationChart from '@/components/charts/BudgetAllocationChart'
import EmergencyFundTracker from '@/components/charts/EmergencyFundTracker'
import FIREProgressCard from '@/components/charts/FIREProgressCard'
import FinancialHealthScore from '@/components/charts/FinancialHealthScore'
import GoalsTracker from '@/components/charts/GoalsTracker'
import { mockUserProfile, mockCashFlowData, mockNetWorthHistory } from '@/lib/mock-data'

export default function DashboardPage() {
  const totalIncome = mockUserProfile.incomes.reduce((sum, inc) => 
    inc.isActive ? sum + inc.amount : sum, 0
  )
  const totalExpenses = mockUserProfile.expenses.reduce((sum, exp) => sum + exp.amount, 0)
  const monthlyNetFlow = totalIncome - totalExpenses
  const totalDebt = mockUserProfile.debts.reduce((sum, debt) => sum + debt.balance, 0)
  const totalAssets = mockUserProfile.assets.reduce((sum, asset) => sum + asset.value, 0)
  const netWorth = totalAssets - totalDebt

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Title className="text-3xl font-bold">Financial Dashboard</Title>
        <Text className="mt-2">Your complete financial overview and planning center</Text>
      </div>

      {/* Key Metrics */}
      <Grid numItemsMd={2} numItemsLg={4} className="gap-6 mb-6">
        <Card decoration="top" decorationColor="emerald">
          <Flex justifyContent="between" alignItems="center">
            <div>
              <Text>Monthly Income</Text>
              <Metric className="mt-2">${totalIncome.toLocaleString()}</Metric>
            </div>
            <BanknotesIcon className="w-8 h-8 text-emerald-600" />
          </Flex>
        </Card>

        <Card decoration="top" decorationColor="rose">
          <Flex justifyContent="between" alignItems="center">
            <div>
              <Text>Monthly Expenses</Text>
              <Metric className="mt-2">${totalExpenses.toLocaleString()}</Metric>
            </div>
            <CalculatorIcon className="w-8 h-8 text-rose-600" />
          </Flex>
        </Card>

        <Card decoration="top" decorationColor={monthlyNetFlow > 0 ? "emerald" : "rose"}>
          <Flex justifyContent="between" alignItems="center">
            <div>
              <Text>Net Cash Flow</Text>
              <Metric className="mt-2">
                {monthlyNetFlow > 0 ? '+' : ''}{monthlyNetFlow.toLocaleString()}
              </Metric>
            </div>
            <ArrowTrendingUpIcon className="w-8 h-8 text-blue-600" />
          </Flex>
        </Card>

        <Card decoration="top" decorationColor="indigo">
          <Flex justifyContent="between" alignItems="center">
            <div>
              <Text>Net Worth</Text>
              <Metric className="mt-2">${netWorth.toLocaleString()}</Metric>
            </div>
            <ChartBarIcon className="w-8 h-8 text-indigo-600" />
          </Flex>
        </Card>
      </Grid>

      {/* Financial Health Score */}
      <div className="mb-6">
        <FinancialHealthScore profile={mockUserProfile} />
      </div>

      {/* Main Charts Row */}
      <Grid numItemsMd={1} numItemsLg={2} className="gap-6 mb-6">
        <CashFlowChart data={mockCashFlowData} />
        <NetWorthChart data={mockNetWorthHistory} />
      </Grid>

      {/* Budget and Emergency Fund Row */}
      <Grid numItemsMd={1} numItemsLg={2} className="gap-6 mb-6">
        <BudgetAllocationChart allocation={mockUserProfile.budgetAllocation} monthlyIncome={totalIncome} />
        <EmergencyFundTracker 
          current={mockUserProfile.emergencyFundCurrent}
          target={mockUserProfile.emergencyFundTarget}
          monthlyExpenses={totalExpenses}
        />
      </Grid>

      {/* Debt Strategy and FIRE Progress */}
      <Grid numItemsMd={1} numItemsLg={2} className="gap-6 mb-6">
        <DebtStrategyCard debts={mockUserProfile.debts} />
        <FIREProgressCard />
      </Grid>

      {/* Goals Tracker */}
      <div className="mb-6">
        <GoalsTracker goals={mockUserProfile.goals} />
      </div>

      {/* Quick Actions */}
      <Card className="mt-6">
        <Title>Quick Actions</Title>
        <Grid numItemsMd={2} numItemsLg={4} className="gap-4 mt-4">
          <button className="p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors text-left">
            <ShieldCheckIcon className="w-6 h-6 text-blue-600 mb-2" />
            <Text className="font-semibold">Update Budget</Text>
            <Text className="text-sm text-gray-600">Adjust your spending categories</Text>
          </button>
          
          <button className="p-4 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors text-left">
            <BanknotesIcon className="w-6 h-6 text-emerald-600 mb-2" />
            <Text className="font-semibold">Add Transaction</Text>
            <Text className="text-sm text-gray-600">Log income or expense</Text>
          </button>
          
          <button className="p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors text-left">
            <FireIcon className="w-6 h-6 text-purple-600 mb-2" />
            <Text className="font-semibold">FIRE Calculator</Text>
            <Text className="text-sm text-gray-600">Plan early retirement</Text>
          </button>
          
          <button className="p-4 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors text-left">
            <ChartBarIcon className="w-6 h-6 text-amber-600 mb-2" />
            <Text className="font-semibold">Investment Analysis</Text>
            <Text className="text-sm text-gray-600">Review portfolio performance</Text>
          </button>
        </Grid>
      </Card>
    </div>
  )
}