import { Request, Response, NextFunction } from 'express';
import { adminAuth } from '../lib/firebase-admin.ts';
import { DecodedIdToken } from 'firebase-admin/auth';

export interface AuthRequest extends Request {
  user?: DecodedIdToken;
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing token' });
  }

  const token = authHeader.split('Bearer ')[1];

  // Local testing/simulation path for custom registered users (LDAP preparation)
  if (token.startsWith('local-t-')) {
    const email = token.replace('local-t-', '');
    req.user = {
      uid: 'local-uid-' + email.replace(/[@.]/g, '-'),
      email: email,
      aud: '',
      auth_time: 0,
      exp: 0,
      firebase: { identities: {}, sign_in_provider: 'local' },
      iat: 0,
      iss: '',
      sub: ''
    } as any;
    return next();
  }

  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('Error verifying Firebase ID token:', error);
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};
