'use client'

import { Card, Title, Text, ProgressBar, Badge, Metric, AreaChart } from '@tremor/react'
import { FireIcon, TrendingUpIcon } from '@heroicons/react/24/outline'
import { mockFIREMetrics } from '@/lib/mock-data'
import { useState } from 'react'

export default function FIREProgressCard() {
  const [metrics] = useState(mockFIREMetrics)
  
  // Calculate FIRE projections
  const calculateFutureValue = (years: number) => {
    const r = metrics.expectedReturn / 100 / 12 // Monthly rate
    const n = years * 12 // Number of months
    const pmt = metrics.monthlyContribution
    const pv = metrics.currentSavings
    
    // Future value formula with monthly contributions
    const futureValue = pv * Math.pow(1 + r, n) + pmt * ((Math.pow(1 + r, n) - 1) / r)
    return Math.round(futureValue)
  }

  // Generate projection data
  const projectionData = []
  for (let year = 0; year <= metrics.yearsToRetirement + 5; year++) {
    projectionData.push({
      year: metrics.currentAge + year,
      'Current Path': calculateFutureValue(year),
      'Target': metrics.targetRetirementAmount,
      'With Extra $500/mo': calculateFutureValue(year) + (500 * 12 * year * Math.pow(1.07, year))
    })
  }

  const yearsToFIRE = projectionData.findIndex(d => d['Current Path'] >= metrics.targetRetirementAmount)
  const currentProgress = (metrics.currentSavings / metrics.targetRetirementAmount) * 100
  const monthlyNeeded = (metrics.targetRetirementAmount * 0.04) / 12 // 4% rule monthly income

  // Calculate time saved with extra contributions
  const yearsWithExtra = projectionData.findIndex(d => d['With Extra $500/mo'] >= metrics.targetRetirementAmount)
  const yearsSaved = yearsToFIRE - yearsWithExtra

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FireIcon className="w-6 h-6 text-orange-600" />
          <div>
            <Title>FIRE Progress Tracker</Title>
            <Text className="mt-1">Financial Independence, Retire Early</Text>
          </div>
        </div>
        <Badge color="orange">
          {yearsToFIRE} years to FIRE
        </Badge>
      </div>

      <div className="space-y-4">
        <div>
          <div className="flex justify-between items-baseline mb-2">
            <div>
              <Metric>${metrics.currentSavings.toLocaleString()}</Metric>
              <Text className="text-sm text-gray-500 mt-1">Current savings</Text>
            </div>
            <div className="text-right">
              <Text className="text-2xl font-bold text-orange-600">
                ${metrics.targetRetirementAmount.toLocaleString()}
              </Text>
              <Text className="text-sm text-gray-500">FIRE target</Text>
            </div>
          </div>
          <ProgressBar 
            value={currentProgress} 
            color="orange"
            className="h-3"
          />
          <Text className="text-sm text-gray-500 mt-1">
            {currentProgress.toFixed(1)}% of FIRE target reached
          </Text>
        </div>

        <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
          <div>
            <Text className="text-sm text-gray-600">Current Age</Text>
            <Text className="font-semibold">{metrics.currentAge} years</Text>
          </div>
          <div>
            <Text className="text-sm text-gray-600">Target FIRE Age</Text>
            <Text className="font-semibold text-orange-600">{metrics.retirementAge} years</Text>
          </div>
          <div>
            <Text className="text-sm text-gray-600">Monthly Contribution</Text>
            <Text className="font-semibold">${metrics.monthlyContribution.toLocaleString()}</Text>
          </div>
          <div>
            <Text className="text-sm text-gray-600">Expected Return</Text>
            <Text className="font-semibold">{metrics.expectedReturn}% annual</Text>
          </div>
        </div>

        <div>
          <Text className="font-semibold mb-3">Projection Chart</Text>
          <AreaChart
            className="h-48"
            data={projectionData.filter(d => d.year <= metrics.retirementAge + 5)}
            index="year"
            categories={['Current Path', 'With Extra $500/mo', 'Target']}
            colors={['blue', 'emerald', 'orange']}
            valueFormatter={(value) => `$${(value / 1000000).toFixed(2)}M`}
            showLegend={true}
            showGridLines={true}
            curveType="natural"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Card decoration="left" decorationColor="orange">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUpIcon className="w-5 h-5 text-orange-600" />
              <Text className="font-semibold">4% Rule Income</Text>
            </div>
            <Metric className="text-xl">${monthlyNeeded.toFixed(0)}/mo</Metric>
            <Text className="text-xs text-gray-500 mt-1">
              Safe withdrawal rate at FIRE
            </Text>
          </Card>

          <Card decoration="left" decorationColor="emerald">
            <div className="flex items-center gap-2 mb-2">
              <FireIcon className="w-5 h-5 text-emerald-600" />
              <Text className="font-semibold">Time Saved</Text>
            </div>
            <Metric className="text-xl">{yearsSaved} years</Metric>
            <Text className="text-xs text-gray-500 mt-1">
              With extra $500/mo contribution
            </Text>
          </Card>
        </div>

        <div className="p-3 bg-orange-50 rounded-lg">
          <Text className="text-sm">
            <span className="font-semibold">🎯 FIRE Strategy:</span> At your current savings rate, 
            you'll reach financial independence at age {metrics.currentAge + yearsToFIRE}. 
            The 4% rule suggests you can safely withdraw ${(metrics.targetRetirementAmount * 0.04).toLocaleString()} 
            annually without depleting your portfolio.
          </Text>
        </div>

        <div className="p-3 bg-emerald-50 rounded-lg">
          <Text className="text-sm">
            <span className="font-semibold">💰 Acceleration Tip:</span> Increasing your monthly 
            contribution by $500 could help you retire {yearsSaved} years earlier!
          </Text>
        </div>
      </div>
    </Card>
  )
}