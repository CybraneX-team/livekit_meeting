import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

interface DecodedToken {
  user_id: string;
  role: string;
  exp: number;
}

export async function verifyRole(req: NextRequest, allowedRoles: string[]) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader) {
    return NextResponse.json({ error: 'Authorization header missing' }, { status: 401 });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return NextResponse.json({ error: 'Token missing' }, { status: 401 });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as DecodedToken;
    if (allowedRoles.includes(decoded.role)) {
      return null;
    } else {
      return NextResponse.json({ error: 'Forbidden: insufficient role' }, { status: 403 });
    }
  } catch (err) {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
  }
}