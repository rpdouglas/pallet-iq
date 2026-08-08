import { describe, expect, it } from 'vitest'
import { isRole } from './auth'

describe('isRole', () => {
  it.each(['owner', 'manager', 'warehouse', 'buyer'])('accepts %s', (value) => {
    expect(isRole(value)).toBe(true)
  })

  it.each([undefined, null, 42, {}, [], '', 'superadmin', 'Owner'])('rejects %s', (value) => {
    expect(isRole(value)).toBe(false)
  })
})
