import { describe, expect, it } from 'vitest'

import { defaultPathFor, getSafeRedirect, hasAnyRole, landingPathFor, roleGroups } from '@/lib/roles'
import { mockUsers } from '@/services/mock/users'

describe('getSafeRedirect', () => {
  it.each(['/bookings', '/shops/good-cut/book?service=1', '/'])('accepts the app path %s', (next) => {
    expect(getSafeRedirect(next)).toBe(next)
  })

  it.each([null, '', 'bookings', '//evil.example', '/\\evil.example', 'https://evil.example'])('rejects %s', (next) => {
    expect(getSafeRedirect(next)).toBeNull()
  })
})

describe('roles', () => {
  it('checks role membership', () => {
    expect(hasAnyRole(mockUsers.merchant, roleGroups.merchant)).toBe(true)
    expect(hasAnyRole(mockUsers.merchant, roleGroups.customer)).toBe(true)
    expect(hasAnyRole(mockUsers.customer, roleGroups.admin)).toBe(false)
    expect(hasAnyRole(null, roleGroups.customer)).toBe(false)
  })

  it('picks a landing page by role', () => {
    expect(defaultPathFor(mockUsers.admin)).toBe('/admin')
    expect(defaultPathFor(mockUsers.merchant)).toBe('/business')
    expect(defaultPathFor(mockUsers.customer)).toBe('/')
  })
})

describe('landingPathFor', () => {
  it('returns to the requested page when the account can open it', () => {
    expect(landingPathFor(mockUsers.customer, '/shops/good-cut/book?service=1')).toBe('/shops/good-cut/book?service=1')
    expect(landingPathFor(mockUsers.merchant, '/business/bookings')).toBe('/business/bookings')
    expect(landingPathFor(mockUsers.customer, '/business/sign-up')).toBe('/business/sign-up')
  })

  it('sends an account to its own home instead of an area it can’t open', () => {
    expect(landingPathFor(mockUsers.customer, '/business')).toBe('/')
    expect(landingPathFor(mockUsers.customer, '/business/onboarding?step=hours')).toBe('/')
    expect(landingPathFor(mockUsers.customer, '/admin/reports')).toBe('/')
    expect(landingPathFor(mockUsers.merchant, '/admin')).toBe('/business')
  })

  it('ignores a missing or unsafe path', () => {
    expect(landingPathFor(mockUsers.customer, null)).toBe('/')
    expect(landingPathFor(mockUsers.merchant, '//evil.example')).toBe('/business')
    // Only whole path segments count: /businesses isn't the business area.
    expect(landingPathFor(mockUsers.customer, '/businesses')).toBe('/businesses')
  })
})
