import { 
  UserFinancialProfile, 
  CashFlow, 
  NetWorthSnapshot,
  FIREMetrics,
  DebtStrategy 
} from '@/types/financial'

export const mockUserProfile: UserFinancialProfile = {
  id: '1',
  userId: 'user-123',
  incomes: [
    { source: 'Salary', amount: 6500, frequency: 'monthly', isActive: true },
    { source: 'Freelance', amount: 1200, frequency: 'monthly', isActive: true },
  ],
  expenses: [
    { category: 'Housing', name: 'Rent', amount: 2000, frequency: 'monthly', isEssential: true, dueDate: 1 },
    { category: 'Transportation', name: 'Car Payment', amount: 450, frequency: 'monthly', isEssential: true, dueDate: 15 },
    { category: 'Utilities', name: 'Electricity', amount: 120, frequency: 'monthly', isEssential: true },
    { category: 'Food', name: 'Groceries', amount: 600, frequency: 'monthly', isEssential: true },
    { category: 'Food', name: 'Dining Out', amount: 300, frequency: 'monthly', isEssential: false },
    { category: 'Entertainment', name: 'Subscriptions', amount: 50, frequency: 'monthly', isEssential: false },
    { category: 'Insurance', name: 'Health Insurance', amount: 350, frequency: 'monthly', isEssential: true },
    { category: 'Personal', name: 'Gym', amount: 50, frequency: 'monthly', isEssential: false },
  ],
  debts: [
    { name: 'Credit Card 1', type: 'credit_card', balance: 5000, interestRate: 18.99, minimumPayment: 150 },
    { name: 'Student Loan', type: 'student_loan', balance: 28000, interestRate: 4.5, minimumPayment: 350 },
    { name: 'Auto Loan', type: 'auto_loan', balance: 15000, interestRate: 5.2, minimumPayment: 450 },
  ],
  assets: [
    { name: 'Checking Account', type: 'cash', value: 3500, liquidityScore: 100 },
    { name: 'Savings Account', type: 'cash', value: 8000, liquidityScore: 100 },
    { name: '401(k)', type: 'investment', value: 45000, liquidityScore: 20 },
    { name: 'Brokerage Account', type: 'investment', value: 12000, liquidityScore: 90 },
    { name: 'Car', type: 'vehicle', value: 20000, liquidityScore: 60 },
  ],
  goals: [
    {
      id: 'g1',
      name: 'Emergency Fund',
      targetAmount: 18000,
      currentAmount: 8000,
      targetDate: new Date('2024-12-31'),
      priority: 'high',
      category: 'emergency_fund'
    },
    {
      id: 'g2',
      name: 'House Down Payment',
      targetAmount: 60000,
      currentAmount: 12000,
      targetDate: new Date('2026-06-30'),
      priority: 'medium',
      category: 'purchase'
    },
    {
      id: 'g3',
      name: 'Retirement',
      targetAmount: 2000000,
      currentAmount: 45000,
      targetDate: new Date('2054-01-01'),
      priority: 'high',
      category: 'retirement'
    }
  ],
  budgetAllocation: {
    needs: 50,
    wants: 30,
    savings: 20,
    actual: {
      needs: 55,
      wants: 25,
      savings: 20
    }
  },
  emergencyFundTarget: 18000,
  emergencyFundCurrent: 8000,
  creditScore: 720,
  lastUpdated: new Date()
}

export const mockCashFlowData: CashFlow[] = [
  { month: 'Jan', income: 7700, expenses: 5920, netFlow: 1780, cumulativeFlow: 1780 },
  { month: 'Feb', income: 7700, expenses: 5920, netFlow: 1780, cumulativeFlow: 3560 },
  { month: 'Mar', income: 7700, expenses: 6200, netFlow: 1500, cumulativeFlow: 5060 },
  { month: 'Apr', income: 7700, expenses: 5920, netFlow: 1780, cumulativeFlow: 6840 },
  { month: 'May', income: 8200, expenses: 6100, netFlow: 2100, cumulativeFlow: 8940 },
  { month: 'Jun', income: 7700, expenses: 5920, netFlow: 1780, cumulativeFlow: 10720 },
  { month: 'Jul', income: 7700, expenses: 6500, netFlow: 1200, cumulativeFlow: 11920 },
  { month: 'Aug', income: 7700, expenses: 5920, netFlow: 1780, cumulativeFlow: 13700 },
  { month: 'Sep', income: 7700, expenses: 5920, netFlow: 1780, cumulativeFlow: 15480 },
  { month: 'Oct', income: 9000, expenses: 6200, netFlow: 2800, cumulativeFlow: 18280 },
  { month: 'Nov', income: 7700, expenses: 7500, netFlow: 200, cumulativeFlow: 18480 },
  { month: 'Dec', income: 10000, expenses: 8500, netFlow: 1500, cumulativeFlow: 19980 },
]

export const mockNetWorthHistory: NetWorthSnapshot[] = [
  { date: new Date('2024-01'), assets: 78500, liabilities: 48000, netWorth: 30500 },
  { date: new Date('2024-02'), assets: 79500, liabilities: 47500, netWorth: 32000 },
  { date: new Date('2024-03'), assets: 80500, liabilities: 47000, netWorth: 33500 },
  { date: new Date('2024-04'), assets: 82000, liabilities: 46500, netWorth: 35500 },
  { date: new Date('2024-05'), assets: 83500, liabilities: 46000, netWorth: 37500 },
  { date: new Date('2024-06'), assets: 85000, liabilities: 45500, netWorth: 39500 },
  { date: new Date('2024-07'), assets: 86500, liabilities: 45000, netWorth: 41500 },
  { date: new Date('2024-08'), assets: 88000, liabilities: 44500, netWorth: 43500 },
  { date: new Date('2024-09'), assets: 89500, liabilities: 44000, netWorth: 45500 },
  { date: new Date('2024-10'), assets: 91000, liabilities: 43500, netWorth: 47500 },
  { date: new Date('2024-11'), assets: 92500, liabilities: 43000, netWorth: 49500 },
  { date: new Date('2024-12'), assets: 94000, liabilities: 42500, netWorth: 51500 },
]

export const mockFIREMetrics: FIREMetrics = {
  currentAge: 32,
  retirementAge: 55,
  currentSavings: 57000,
  monthlyContribution: 2000,
  expectedReturn: 7,
  inflationRate: 3,
  targetRetirementAmount: 2000000,
  yearsToRetirement: 23,
  progressPercentage: 2.85
}

export const mockDebtStrategy: DebtStrategy = {
  type: 'avalanche',
  debts: [
    {
      debt: mockUserProfile.debts[0],
      payoffOrder: 1,
      monthsToPayoff: 24,
      totalInterestPaid: 950,
      recommendedPayment: 250
    },
    {
      debt: mockUserProfile.debts[2],
      payoffOrder: 2,
      monthsToPayoff: 36,
      totalInterestPaid: 1200,
      recommendedPayment: 450
    },
    {
      debt: mockUserProfile.debts[1],
      payoffOrder: 3,
      monthsToPayoff: 84,
      totalInterestPaid: 3800,
      recommendedPayment: 350
    }
  ],
  totalInterestSaved: 2400,
  totalMonthsSaved: 12
}