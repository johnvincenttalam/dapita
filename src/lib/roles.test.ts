import { describe, expect, it } from 'vitest'

import { defaultPathFor, getSafeRedirect, hasAnyRole, roleGroups } from '@/lib/roles'
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
