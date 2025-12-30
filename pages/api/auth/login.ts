import type { NextApiRequest, NextApiResponse } from 'next';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { loadUserCredentialsFromSecrets } from '@/utils/userCredentials';

const JWT_SECRET = process.env.JWT_SECRET || 'roadmap-secret-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

type LoginResponse = { token: string; username: string } | { error: string };

export default async function handler(req: NextApiRequest, res: NextApiResponse<LoginResponse>) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { username, password } = req.body ?? {};

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const users = loadUserCredentialsFromSecrets();
  if (!users.length) {
    return res.status(400).json({ error: 'No USER_* credentials configured on this deployment' });
  }

  const match = users.find(
    (user) => user.username.toLowerCase() === String(username).toLowerCase()
  );

  if (!match) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  const passwordMatch = await bcrypt.compare(password, match.passwordHash);
  if (!passwordMatch) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  const token = jwt.sign(
    {
      username: match.username,
      displayName: match.username,
      isAdmin: true,
      source: match.source,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

  return res.status(200).json({
    token,
    username: match.username,
  });
}
