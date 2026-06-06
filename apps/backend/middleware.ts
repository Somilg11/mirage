/// <reference path="./types.d.ts" />
import { createClient } from "@supabase/supabase-js";
import type { Request, Response, NextFunction } from "express";
import dotenv from 'dotenv';
import { prisma } from "db";

// load .env so local env vars are available
dotenv.config();

export const middleware = async (req: Request, res: Response, next: NextFunction) => {
  console.log(`${new Date().toISOString()} - middleware: incoming ${req.method} ${req.path}`);
  // Test bypass: when running integration tests set TEST_SKIP_AUTH=1 and optionally provide
  // a header 'x-test-address' with a user address. This avoids calling external Supabase in CI/local tests.
  if (process.env.TEST_SKIP_AUTH === '1') {
    const testAddress = (req.headers['x-test-address'] as string) || 'test-address';
    try {
      const userDb = await prisma.user.upsert({
        where: { address: testAddress },
        update: { address: testAddress },
        create: { address: testAddress, usdBalance: 100000 },
      });
      (req as any).userId = userDb.id;
      return next();
    } catch (err) {
      console.error('Failed to upsert test user in middleware bypass:', err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  const supabaseKey = process.env.SUPABASE_SECRET_KEY;
  const supabaseUrl = process.env.SUPABASE_URL;
  if (!supabaseKey) {
    console.error('SUPABASE_SECRET_KEY is not set in environment');
    return res.status(500).json({ error: 'Server misconfiguration: missing SUPABASE_SECRET_KEY' });
  }
  if (!supabaseUrl) {
    console.error('SUPABASE_URL is not set in environment');
    return res.status(500).json({ error: 'Server misconfiguration: missing SUPABASE_URL' });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Express lower-cases header names and exposes them on req.headers
  const authHeader = req.headers.authorization || req.header('authorization');
  if (!authHeader) {
    console.warn('No Authorization header present');
    return res.status(401).json({ error: 'Missing Authorization header' });
  }

  // Accept both 'Bearer <token>' and raw token
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;

  try {
    const { data, error } = await supabase.auth.getUser(token);
    if (error) {
      console.error('Supabase getUser error', error);
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const user = data?.user;
    console.log('Authenticated user:', user?.id ?? null);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    // attach user to request for downstream handlers if needed
    (req as any).user = user;

    const address: string = user?.user_metadata?.custom_claims?.address;
    const userDb = await prisma.user.upsert({
      where: { address },
      update: {
        address,
      },
      create: {
        address,
        usdBalance: 1000, // $10 in cents
      },
    });
    if(address) {
      (req as any).userId = userDb.id; // assignment recorded
      next();
    } else {
      res.status(403).json({ error: 'Forbidden: address claim missing' });
    }
  } catch (error) {
    console.error('Error occurred while authenticating user:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }

};