'use client'

import { Card, Title, Text, ProgressCircle, Grid, Badge, List, ListItem } from '@tremor/react'
import { UserFinancialProfile } from '@/types/financial'
import { CheckCircleIcon, XCircleIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline'

interface FinancialHealthScoreProps {
  profile: UserFinancialProfile
}

export default function FinancialHealthScore({ profile }: FinancialHealthScoreProps) {
  // Calculate various health metrics
  const totalIncome = profile.incomes.reduce((sum, inc) => inc.isActive ? sum + inc.amount : sum, 0)
  const totalExpenses = profile.expenses.reduce((sum, exp) => sum + exp.amount, 0)
  const totalDebt = profile.debts.reduce((sum, debt) => sum + debt.balance, 0)
  const totalAssets = profile.assets.reduce((sum, asset) => sum + asset.value, 0)
  
  // Scoring factors (0-100 each)
  const scores = {
    // Emergency Fund Score (0-100)
    emergencyFund: Math.min(100, (profile.emergencyFundCurrent / profile.emergencyFundTarget) * 100),
    
    // Debt-to-Income Ratio Score (lower is better)
    debtToIncome: Math.max(0, 100 - ((totalDebt / (totalIncome * 12)) * 100)),
    
    // Savings Rate Score
    savingsRate: Math.min(100, ((totalIncome - totalExpenses) / totalIncome) * 100 * 5), // 20% savings = 100 score
    
    // Net Worth Growth Score (simplified)
    netWorth: Math.min(100, (totalAssets / Math.max(1, totalDebt)) * 20), // 5x assets to debt = 100 score
    
    // Credit Score Factor
    creditScore: profile.creditScore ? (profile.creditScore / 850) * 100 : 50,
    
    // Budget Adherence Score
    budgetAdherence: 100 - Math.abs(profile.budgetAllocation.actual.needs - profile.budgetAllocation.needs) * 2
  }

  // Calculate overall score (weighted average)
  const overallScore = Math.round(
    (scores.emergencyFund * 0.25) +
    (scores.debtToIncome * 0.20) +
    (scores.savingsRate * 0.20) +
    (scores.netWorth * 0.15) +
    (scores.creditScore * 0.10) +
    (scores.budgetAdherence * 0.10)
  )

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'emerald'
    if (score >= 60) return 'amber'
    return 'rose'
  }

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Excellent'
    if (score >= 60) return 'Good'
    if (score >= 40) return 'Fair'
    return 'Needs Improvement'
  }

  const healthChecks = [
    {
      label: 'Emergency Fund',
      status: scores.emergencyFund >= 100 ? 'complete' : scores.emergencyFund >= 50 ? 'partial' : 'incomplete',
      description: `${(profile.emergencyFundCurrent / totalExpenses).toFixed(1)} months saved`
    },
    {
      label: 'Positive Cash Flow',
      status: totalIncome > totalExpenses ? 'complete' : 'incomplete',
      description: `$${Math.abs(totalIncome - totalExpenses).toLocaleString()} ${totalIncome > totalExpenses ? 'surplus' : 'deficit'}`
    },
    {
      label: 'Debt Management',
      status: scores.debtToIncome >= 70 ? 'complete' : scores.debtToIncome >= 40 ? 'partial' : 'incomplete',
      description: `${((totalDebt / (totalIncome * 12)) * 100).toFixed(1)}% debt-to-income`
    },
    {
      label: 'Retirement Savings',
      status: profile.assets.some(a => a.type === 'investment' && a.value > 0) ? 'complete' : 'incomplete',
      description: profile.assets.some(a => a.type === 'investment') ? 'Contributing' : 'Not started'
    },
    {
      label: 'Credit Health',
      status: (profile.creditScore || 0) >= 700 ? 'complete' : (profile.creditScore || 0) >= 600 ? 'partial' : 'incomplete',
      description: `Score: ${profile.creditScore || 'Unknown'}`
    }
  ]

  return (
    <Card>
      <Title className="text-xl mb-4">Financial Health Score</Title>
      
      <Grid numItemsMd={2} className="gap-6">
        <div className="flex flex-col items-center justify-center">
          <ProgressCircle
            value={overallScore}
            size="xl"
            color={getScoreColor(overallScore)}
            className="mb-4"
          >
            <Text className="text-3xl font-bold">{overallScore}</Text>
          </ProgressCircle>
          <Badge size="lg" color={getScoreColor(overallScore)}>
            {getScoreLabel(overallScore)}
          </Badge>
          <Text className="text-center mt-2 text-gray-500">
            Your financial health is {getScoreLabel(overallScore).toLowerCase()}
          </Text>
        </div>

        <div>
          <Text className="font-semibold mb-3">Health Checkpoints</Text>
          <List className="space-y-2">
            {healthChecks.map((check, index) => (
              <ListItem key={index}>
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    {check.status === 'complete' ? (
                      <CheckCircleIcon className="w-5 h-5 text-emerald-600" />
                    ) : check.status === 'partial' ? (
                      <ExclamationCircleIcon className="w-5 h-5 text-amber-600" />
                    ) : (
                      <XCircleIcon className="w-5 h-5 text-rose-600" />
                    )}
                    <Text className={
                      check.status === 'complete' ? 'text-emerald-700' :
                      check.status === 'partial' ? 'text-amber-700' :
                      'text-rose-700'
                    }>
                      {check.label}
                    </Text>
                  </div>
                  <Text className="text-sm text-gray-500">
                    {check.description}
                  </Text>
                </div>
              </ListItem>
            ))}
          </List>
        </div>
      </Grid>

      <div className="mt-6 grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <Text className="text-xs text-gray-500">Emergency Fund</Text>
          <Text className="font-bold text-lg">{scores.emergencyFund.toFixed(0)}</Text>
        </div>
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <Text className="text-xs text-gray-500">Debt Score</Text>
          <Text className="font-bold text-lg">{scores.debtToIncome.toFixed(0)}</Text>
        </div>
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <Text className="text-xs text-gray-500">Savings Rate</Text>
          <Text className="font-bold text-lg">{scores.savingsRate.toFixed(0)}</Text>
        </div>
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <Text className="text-xs text-gray-500">Net Worth</Text>
          <Text className="font-bold text-lg">{scores.netWorth.toFixed(0)}</Text>
        </div>
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <Text className="text-xs text-gray-500">Credit Score</Text>
          <Text className="font-bold text-lg">{scores.creditScore.toFixed(0)}</Text>
        </div>
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <Text className="text-xs text-gray-500">Budget</Text>
          <Text className="font-bold text-lg">{scores.budgetAdherence.toFixed(0)}</Text>
        </div>
      </div>
    </Card>
  )
}