import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';

export interface VendorPayload {
  type: 'vendor';
  vendorId: string;
  email: string;
}

export interface CustomerPayload {
  type: 'customer';
  customerId: string;
  email: string;
}

declare global {
  namespace Express {
    interface Request {
      vendor?: VendorPayload;
      customer?: CustomerPayload;
    }
  }
}

export function requireVendor(req: Request, res: Response, next: NextFunction) {
  const token = extractToken(req);
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const payload = jwt.verify(token, config.jwtVendorSecret) as VendorPayload;
    if (payload.type !== 'vendor') return res.status(401).json({ error: 'Unauthorized' });
    req.vendor = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

export function requireCustomer(req: Request, res: Response, next: NextFunction) {
  const token = extractToken(req);
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const payload = jwt.verify(token, config.jwtCustomerSecret) as CustomerPayload;
    if (payload.type !== 'customer') return res.status(401).json({ error: 'Unauthorized' });
    req.customer = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

function extractToken(req: Request): string | null {
  const auth = req.headers.authorization;
  if (auth?.startsWith('Bearer ')) return auth.slice(7);
  return null;
}

export function signVendorToken(payload: Omit<VendorPayload, 'type'>): string {
  return jwt.sign({ ...payload, type: 'vendor' }, config.jwtVendorSecret, {
    expiresIn: config.jwtExpiresIn,
  } as jwt.SignOptions);
}

export function signCustomerToken(payload: Omit<CustomerPayload, 'type'>): string {
  return jwt.sign({ ...payload, type: 'customer' }, config.jwtCustomerSecret, {
    expiresIn: config.jwtExpiresIn,
  } as jwt.SignOptions);
}
