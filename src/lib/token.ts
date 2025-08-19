import jwt from 'jsonwebtoken'

const SECRET = process.env.TOKEN_SIGNING_SECRET || 'dev'

export interface PartnerToken {
  company_id: string
  partner_id: string
  scope: string
  exp: number
}

export function verifyToken(t: string): PartnerToken {
  return jwt.verify(t, SECRET) as PartnerToken
}
