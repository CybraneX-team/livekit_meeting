import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';

export async function GET() {
  const cookieStore = await cookies();
  const existingToken = cookieStore.get('accessToken');

  // Default payload for new tokens
  const defaultPayload = { metadata: { role: 'participant' } };

  // If access token exists, validate it
  if (existingToken) {
    try {
      // Verify the token
      await jwtVerify(
        existingToken.value,
        new TextEncoder().encode(process.env.JWT_SECRET)
      );
      
      // If token is valid, return without doing anything
      return NextResponse.json({ message: 'Valid access token exists' });
    } catch (error) {
      // If token is invalid, we'll create a new one with default payload
      console.log('Token validation failed:', error);
    }
  }

  // Create new JWT with default payload
  const token = await new SignJWT(defaultPayload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .sign(new TextEncoder().encode(process.env.JWT_SECRET));

  // Create response with the new token
  const response = NextResponse.json({ message: 'Access token created' });

  // Set cookie with strict security settings
  response.cookies.set('accessToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
  });

  return response;
}