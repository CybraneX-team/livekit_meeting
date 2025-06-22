import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { metadata } from '@/app/layout';

// In a real application, you should use environment variables and proper password hashing
const CORRECT_PASSWORD = 'admin123'; // This is just for demonstration
const JWT_SECRET: jwt.Secret = process.env.JWT_SECRET || ""

export async function POST(request: Request) {
  try {
    const { password } = await request.json();

    if (!password) {
      return NextResponse.json(
        { error: 'Password is required' },
        { status: 400 }
      );
    }

    if (password === CORRECT_PASSWORD) {
      // Create JWT payload
      const payload = {
        metadata: {
          role: 'host',
          iat: Math.floor(Date.now() / 1000), // Issued at
        }
      };

      // Sign the JWT
      const accessToken = jwt.sign(payload, JWT_SECRET, {
        algorithm: 'HS256'
      });

      const response = NextResponse.json({ success: true });
      
      // Set secure cookie with actual JWT
      response.cookies.set('accessToken', accessToken, {
        httpOnly: true,
        sameSite: 'strict',
        path: '/',
      });

      return response;
    }

    return NextResponse.json(
      { error: 'Invalid password' },
      { status: 401 }
    );
  } catch (error) {
    console.error('JWT signing error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}