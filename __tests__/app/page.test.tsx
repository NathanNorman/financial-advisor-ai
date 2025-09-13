import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import DashboardPage from '@/app/page'

describe('Dashboard Page', () => {
  it('renders the financial dashboard title', () => {
    render(<DashboardPage />)
    
    const heading = screen.getByText('Financial Dashboard')
    expect(heading).toBeInTheDocument()
  })

  it('renders key metrics cards', () => {
    render(<DashboardPage />)
    
    expect(screen.getByText('Monthly Income')).toBeInTheDocument()
    expect(screen.getAllByText('Monthly Expenses')[0]).toBeInTheDocument()
    expect(screen.getByText('Net Cash Flow')).toBeInTheDocument()
    expect(screen.getAllByText('Net Worth')[0]).toBeInTheDocument()
  })

  it('renders all dashboard sections', () => {
    render(<DashboardPage />)
    
    expect(screen.getByText('Financial Health Score')).toBeInTheDocument()
    expect(screen.getByText('Cash Flow Analysis')).toBeInTheDocument()
    expect(screen.getByText('Net Worth Progression')).toBeInTheDocument()
    expect(screen.getByText('Emergency Fund Status')).toBeInTheDocument()
    expect(screen.getByText('Debt Elimination Strategy')).toBeInTheDocument()
    expect(screen.getByText('FIRE Progress Tracker')).toBeInTheDocument()
    expect(screen.getByText('Financial Goals Tracker')).toBeInTheDocument()
  })
})