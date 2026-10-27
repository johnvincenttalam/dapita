// Domain types for the demo pages. Replace these with your own entities.

export type CustomerPlan = 'free' | 'pro' | 'enterprise'
export type CustomerStatus = 'active' | 'trialing' | 'paused' | 'churned'

export interface Customer {
  id: string
  name: string
  email: string
  company: string
  plan: CustomerPlan
  status: CustomerStatus
  seats: number
  /** ISO 8601 date string */
  createdAt: string
}

export type MetricTrend = 'up' | 'down' | 'flat'

export interface Metric {
  id: string
  label: string
  value: string
  change: string
  trend: MetricTrend
  helpText: string
}

export type ActivityKind = 'signup' | 'upgrade' | 'comment' | 'invoice' | 'alert'

export interface Activity {
  id: string
  kind: ActivityKind
  actor: string
  message: string
  /** ISO 8601 date-time string */
  occurredAt: string
}

export interface Profile {
  firstName: string
  lastName: string
  email: string
  username: string
  bio: string
  website: string
  timezone: string
}

export interface NotificationPreferences {
  emailDigest: 'never' | 'daily' | 'weekly'
  productUpdates: boolean
  securityAlerts: boolean
  mentions: boolean
  marketing: boolean
}
