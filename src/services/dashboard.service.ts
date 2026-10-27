import { apiClient } from '@/lib/api-client'
import { env } from '@/lib/env'
import { mockActivity, mockCustomers } from '@/services/mock/data'
import { applyDemoScenario, clone, delay } from '@/services/mock/utils'
import type { Activity, Customer, Metric } from '@/types/domain'

export interface DashboardService {
  getMetrics: () => Promise<Metric[]>
  getRecentActivity: () => Promise<Activity[]>
  getCustomers: () => Promise<Customer[]>
  deleteCustomer: (id: string) => Promise<void>
}

const httpDashboardService: DashboardService = {
  getMetrics: () => apiClient.get<Metric[]>('/dashboard/metrics'),
  getRecentActivity: () => apiClient.get<Activity[]>('/dashboard/activity'),
  getCustomers: () => apiClient.get<Customer[]>('/customers'),
  deleteCustomer: (id) => apiClient.delete<void>(`/customers/${encodeURIComponent(id)}`),
}

function buildMockMetrics(customers: Customer[]): Metric[] {
  const count = (status: Customer['status']) => customers.filter((c) => c.status === status).length
  const seats = customers.reduce((total, c) => total + c.seats, 0)
  return [
    {
      id: 'customers',
      label: 'Total customers',
      value: String(customers.length),
      change: '+12%',
      trend: 'up',
      helpText: 'vs. last month',
    },
    {
      id: 'active',
      label: 'Active',
      value: String(count('active')),
      change: '+4%',
      trend: 'up',
      helpText: 'vs. last month',
    },
    {
      id: 'trialing',
      label: 'In trial',
      value: String(count('trialing')),
      change: '0%',
      trend: 'flat',
      helpText: 'vs. last month',
    },
    {
      id: 'seats',
      label: 'Licensed seats',
      value: seats.toLocaleString('en-US'),
      change: '-3%',
      trend: 'down',
      helpText: 'vs. last month',
    },
  ]
}

// MOCK: an in-memory copy so deletes are visible until the page reloads.
let customersStore = clone(mockCustomers)

const mockDashboardService: DashboardService = {
  async getMetrics() {
    const empty = await applyDemoScenario()
    return buildMockMetrics(empty ? [] : customersStore)
  },
  async getRecentActivity() {
    const empty = await applyDemoScenario()
    return empty ? [] : clone(mockActivity)
  },
  async getCustomers() {
    const empty = await applyDemoScenario()
    return empty ? [] : clone(customersStore)
  },
  async deleteCustomer(id) {
    await delay(700)
    customersStore = customersStore.filter((customer) => customer.id !== id)
  },
}

export const dashboardService: DashboardService = env.useMocks ? mockDashboardService : httpDashboardService
