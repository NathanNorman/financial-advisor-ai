'use client'

import { Card, Title, Text, ProgressBar, Badge, Metric, List, ListItem } from '@tremor/react'
import { ShieldCheckIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'

interface EmergencyFundTrackerProps {
  current: number
  target: number
  monthlyExpenses: number
}

export default function EmergencyFundTracker({ current, target, monthlyExpenses }: EmergencyFundTrackerProps) {
  const progressPercentage = (current / target) * 100
  const monthsCovered = current / monthlyExpenses
  const recommendedMonths = 6
  const remainingToSave = target - current
  const monthlySavingsNeeded = remainingToSave / 12 // To reach goal in 1 year

  const getStatusColor = () => {
    if (monthsCovered >= recommendedMonths) return 'emerald'
    if (monthsCovered >= 3) return 'amber'
    return 'rose'
  }

  const milestones = [
    { months: 1, label: '1 Month', reached: monthsCovered >= 1 },
    { months: 3, label: '3 Months', reached: monthsCovered >= 3 },
    { months: 6, label: '6 Months', reached: monthsCovered >= 6 },
    { months: 9, label: '9 Months', reached: monthsCovered >= 9 },
  ]

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ShieldCheckIcon className="w-6 h-6 text-blue-600" />
          <div>
            <Title>Emergency Fund Status</Title>
            <Text className="mt-1">Financial safety net progress</Text>
          </div>
        </div>
        <Badge color={getStatusColor()}>
          {monthsCovered.toFixed(1)} months covered
        </Badge>
      </div>

      <div className="space-y-4">
        <div>
          <div className="flex justify-between items-baseline mb-2">
            <Metric>${current.toLocaleString()}</Metric>
            <Text className="text-gray-500">of ${target.toLocaleString()}</Text>
          </div>
          <ProgressBar 
            value={progressPercentage} 
            color={getStatusColor()}
            className="h-3"
          />
          <Text className="text-sm text-gray-500 mt-1">
            {progressPercentage.toFixed(1)}% of target reached
          </Text>
        </div>

        <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
          <div>
            <Text className="text-sm text-gray-600">Monthly Expenses</Text>
            <Text className="font-semibold">${monthlyExpenses.toLocaleString()}</Text>
          </div>
          <div>
            <Text className="text-sm text-gray-600">Months Protected</Text>
            <Text className="font-semibold">{monthsCovered.toFixed(1)} months</Text>
          </div>
          <div>
            <Text className="text-sm text-gray-600">Amount Needed</Text>
            <Text className="font-semibold text-rose-600">
              ${remainingToSave.toLocaleString()}
            </Text>
          </div>
          <div>
            <Text className="text-sm text-gray-600">Save Monthly</Text>
            <Text className="font-semibold text-emerald-600">
              ${monthlySavingsNeeded.toFixed(0)}
            </Text>
          </div>
        </div>

        <div>
          <Text className="font-semibold mb-3">Milestones</Text>
          <List>
            {milestones.map((milestone, index) => (
              <ListItem key={index}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded-full ${
                      milestone.reached ? 'bg-emerald-500' : 'bg-gray-300'
                    }`} />
                    <Text className={milestone.reached ? 'text-emerald-600 font-medium' : 'text-gray-500'}>
                      {milestone.label}
                    </Text>
                  </div>
                  <Text className="text-sm text-gray-500">
                    ${(monthlyExpenses * milestone.months).toLocaleString()}
                  </Text>
                </div>
              </ListItem>
            ))}
          </List>
        </div>

        {monthsCovered < recommendedMonths && (
          <div className="p-3 bg-amber-50 rounded-lg flex items-start gap-2">
            <ExclamationTriangleIcon className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <Text className="text-sm">
              <span className="font-semibold">Recommendation:</span> Aim for at least 6 months 
              of expenses saved. You need ${((recommendedMonths * monthlyExpenses) - current).toLocaleString()} more.
            </Text>
          </div>
        )}
      </div>
    </Card>
  )
}