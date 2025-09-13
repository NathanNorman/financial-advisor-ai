'use client'

import { Card, Title, Text, ProgressBar, Badge, Grid, List, ListItem, Flex } from '@tremor/react'
import { FinancialGoal } from '@/types/financial'
import { format, differenceInDays } from 'date-fns'
import { 
  HomeIcon, 
  AcademicCapIcon, 
  CurrencyDollarIcon,
  ShieldCheckIcon,
  ChartBarIcon,
  SparklesIcon
} from '@heroicons/react/24/outline'

interface GoalsTrackerProps {
  goals: FinancialGoal[]
}

export default function GoalsTracker({ goals }: GoalsTrackerProps) {
  const getGoalIcon = (category: FinancialGoal['category']) => {
    switch (category) {
      case 'emergency_fund':
        return <ShieldCheckIcon className="w-5 h-5" />
      case 'retirement':
        return <ChartBarIcon className="w-5 h-5" />
      case 'purchase':
        return <HomeIcon className="w-5 h-5" />
      case 'debt_payoff':
        return <CurrencyDollarIcon className="w-5 h-5" />
      case 'investment':
        return <AcademicCapIcon className="w-5 h-5" />
      default:
        return <SparklesIcon className="w-5 h-5" />
    }
  }

  const getPriorityColor = (priority: FinancialGoal['priority']) => {
    switch (priority) {
      case 'high':
        return 'rose'
      case 'medium':
        return 'amber'
      case 'low':
        return 'blue'
    }
  }

  const getGoalColor = (progress: number) => {
    if (progress >= 100) return 'emerald'
    if (progress >= 75) return 'blue'
    if (progress >= 50) return 'amber'
    return 'rose'
  }

  const calculateMonthlyNeeded = (goal: FinancialGoal) => {
    const remaining = goal.targetAmount - goal.currentAmount
    const daysUntilTarget = differenceInDays(goal.targetDate, new Date())
    const monthsRemaining = Math.max(1, daysUntilTarget / 30)
    return remaining / monthsRemaining
  }

  const sortedGoals = [...goals].sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 }
    return priorityOrder[a.priority] - priorityOrder[b.priority]
  })

  const totalGoalValue = goals.reduce((sum, goal) => sum + goal.targetAmount, 0)
  const totalSaved = goals.reduce((sum, goal) => sum + goal.currentAmount, 0)
  const overallProgress = (totalSaved / totalGoalValue) * 100

  return (
    <Card>
      <div className="mb-6">
        <Flex justifyContent="between" alignItems="center">
          <div>
            <Title>Financial Goals Tracker</Title>
            <Text className="mt-1">Track progress toward your financial objectives</Text>
          </div>
          <div className="text-right">
            <Text className="text-2xl font-bold">{overallProgress.toFixed(1)}%</Text>
            <Text className="text-sm text-gray-500">Overall Progress</Text>
          </div>
        </Flex>
      </div>

      <div className="mb-6">
        <ProgressBar 
          value={overallProgress} 
          color="indigo"
          className="h-2"
        />
        <Flex justifyContent="between" className="mt-2">
          <Text className="text-sm text-gray-500">
            ${totalSaved.toLocaleString()} saved
          </Text>
          <Text className="text-sm text-gray-500">
            ${totalGoalValue.toLocaleString()} total goals
          </Text>
        </Flex>
      </div>

      <Grid numItemsMd={1} numItemsLg={2} className="gap-4 mb-6">
        {sortedGoals.map((goal) => {
          const progress = (goal.currentAmount / goal.targetAmount) * 100
          const monthlyNeeded = calculateMonthlyNeeded(goal)
          const daysRemaining = differenceInDays(goal.targetDate, new Date())
          
          return (
            <Card key={goal.id} decoration="left" decorationColor={getPriorityColor(goal.priority)}>
              <div className="space-y-3">
                <Flex justifyContent="between" alignItems="start">
                  <div className="flex items-start gap-2">
                    <div className={`p-2 rounded-lg bg-${getPriorityColor(goal.priority)}-50`}>
                      {getGoalIcon(goal.category)}
                    </div>
                    <div>
                      <Text className="font-semibold">{goal.name}</Text>
                      <Text className="text-xs text-gray-500">
                        Target: {format(goal.targetDate, 'MMM yyyy')} ({daysRemaining} days)
                      </Text>
                    </div>
                  </div>
                  <Badge color={getPriorityColor(goal.priority)}>
                    {goal.priority}
                  </Badge>
                </Flex>

                <div>
                  <Flex justifyContent="between" className="mb-1">
                    <Text className="text-sm font-medium">
                      ${goal.currentAmount.toLocaleString()}
                    </Text>
                    <Text className="text-sm text-gray-500">
                      ${goal.targetAmount.toLocaleString()}
                    </Text>
                  </Flex>
                  <ProgressBar
                    value={progress}
                    color={getGoalColor(progress)}
                    className="h-2"
                  />
                  <Text className="text-xs text-gray-500 mt-1">
                    {progress.toFixed(1)}% complete
                  </Text>
                </div>

                <div className="grid grid-cols-2 gap-2 p-2 bg-gray-50 rounded">
                  <div>
                    <Text className="text-xs text-gray-500">Remaining</Text>
                    <Text className="text-sm font-medium">
                      ${(goal.targetAmount - goal.currentAmount).toLocaleString()}
                    </Text>
                  </div>
                  <div>
                    <Text className="text-xs text-gray-500">Monthly needed</Text>
                    <Text className="text-sm font-medium text-indigo-600">
                      ${monthlyNeeded.toFixed(0)}
                    </Text>
                  </div>
                </div>

                {progress >= 100 && (
                  <div className="p-2 bg-emerald-50 rounded-lg">
                    <Text className="text-xs text-emerald-700 font-medium">
                      ✓ Goal Achieved!
                    </Text>
                  </div>
                )}

                {progress < 100 && daysRemaining < 30 && (
                  <div className="p-2 bg-amber-50 rounded-lg">
                    <Text className="text-xs text-amber-700 font-medium">
                      ⚠️ Deadline approaching
                    </Text>
                  </div>
                )}
              </div>
            </Card>
          )
        })}
      </Grid>

      <div className="p-4 bg-indigo-50 rounded-lg">
        <Text className="text-sm">
          <span className="font-semibold">💡 Smart Saving:</span> To meet all your goals on time, 
          you need to save approximately ${
            sortedGoals.reduce((sum, goal) => sum + calculateMonthlyNeeded(goal), 0).toFixed(0)
          } per month. Consider automating transfers to dedicated savings accounts for each goal.
        </Text>
      </div>
    </Card>
  )
}