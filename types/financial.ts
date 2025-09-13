export interface Income {
  source: string
  amount: number
  frequency: 'monthly' | 'biweekly' | 'weekly' | 'annual'
  isActive: boolean
}

export interface Expense {
  category: string
  name: string
  amount: number
  frequency: 'monthly' | 'weekly' | 'daily' | 'annual'
  isEssential: boolean
  dueDate?: number
}

export interface Debt {
  name: string
  type: 'credit_card' | 'student_loan' | 'mortgage' | 'auto_loan' | 'personal_loan' | 'other'
  balance: number
  interestRate: number
  minimumPayment: number
  targetPayoffDate?: Date
}

export interface Asset {
  name: string
  type: 'cash' | 'investment' | 'real_estate' | 'vehicle' | 'other'
  value: number
  liquidityScore: number // 0-100, how quickly it can be converted to cash
}

export interface FinancialGoal {
  id: string
  name: string
  targetAmount: number
  currentAmount: number
  targetDate: Date
  priority: 'high' | 'medium' | 'low'
  category: 'emergency_fund' | 'retirement' | 'purchase' | 'debt_payoff' | 'investment' | 'other'
}

export interface BudgetAllocation {
  needs: number // 50%
  wants: number // 30%
  savings: number // 20%
  actual: {
    needs: number
    wants: number
    savings: number
  }
}

export interface CashFlow {
  month: string
  income: number
  expenses: number
  netFlow: number
  cumulativeFlow: number
}

export interface NetWorthSnapshot {
  date: Date
  assets: number
  liabilities: number
  netWorth: number
}

export interface FIREMetrics {
  currentAge: number
  retirementAge: number
  currentSavings: number
  monthlyContribution: number
  expectedReturn: number
  inflationRate: number
  targetRetirementAmount: number
  yearsToRetirement: number
  progressPercentage: number
}

export interface UserFinancialProfile {
  id: string
  userId: string
  incomes: Income[]
  expenses: Expense[]
  debts: Debt[]
  assets: Asset[]
  goals: FinancialGoal[]
  budgetAllocation: BudgetAllocation
  emergencyFundTarget: number
  emergencyFundCurrent: number
  creditScore?: number
  lastUpdated: Date
}

export interface DebtStrategy {
  type: 'avalanche' | 'snowball'
  debts: Array<{
    debt: Debt
    payoffOrder: number
    monthsToPayoff: number
    totalInterestPaid: number
    recommendedPayment: number
  }>
  totalInterestSaved: number
  totalMonthsSaved: number
}