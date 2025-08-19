import { test, expect } from '@playwright/test'
import jwt from 'jsonwebtoken'

const SECRET = process.env.TOKEN_SIGNING_SECRET || 'dev'
const token = jwt.sign({ company_id: '00000000-0000-0000-0000-000000000000', partner_id: '00000000-0000-0000-0000-000000000000', scope: 'create_booking' }, SECRET)

test('availability without token', async ({ request }) => {
  const res = await request.get('/api/demo/demo/availability?date=2023-01-01')
  expect(res.status()).toBe(401)
})

test('availability with token', async ({ request }) => {
  const res = await request.get(`/api/demo/demo/availability?date=2023-01-01&token=${token}`)
  expect(res.status()).toBe(200)
})
