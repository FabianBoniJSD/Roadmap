import { NextApiRequest, NextApiResponse } from 'next'
import * as bcrypt from 'bcrypt'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).end(`Method ${req.method} Not Allowed`)
  }

  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' })
    }

    // Static admin credentials via env (hash optional)
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com'
    const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH // bcrypt hash
    const adminPasswordPlain = process.env.ADMIN_PASSWORD // fallback plain text (avoid in prod)

    if (email !== adminEmail) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }

    let valid = false
    if (adminPasswordHash) {
      valid = await bcrypt.compare(password, adminPasswordHash)
    } else if (adminPasswordPlain) {
      valid = password === adminPasswordPlain
    }

    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }

    res.status(200).json({
      success: true,
      user: {
        id: 'admin',
        email: adminEmail,
        name: 'Admin',
        role: 'ADMIN',
      },
    })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}
