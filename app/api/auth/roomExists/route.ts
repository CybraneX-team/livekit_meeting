import { NextRequest, NextResponse } from 'next/server';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { RoomServiceClient } from 'livekit-server-sdk';

const JWT_SECRET = process.env.JWT_SECRET || '';

export async function GET(request: NextRequest) {
  try {
    // Get accessToken from cookies
    const accessToken = request.cookies.get('accessToken')?.value;
    if (!accessToken) {
      return NextResponse.json({ error: 'Missing accessToken' }, { status: 401 });
    }

    // Verify and decode the token
    let payload: JwtPayload | undefined;
    try {
      const verified = jwt.verify(accessToken, JWT_SECRET, { algorithms: ['HS256'] });
      if (typeof verified === 'object') {
        payload = verified as JwtPayload;
      } else {
        return NextResponse.json({ error: 'Invalid accessToken payload' }, { status: 401 });
      }
    } catch (error) {
      return NextResponse.json({ error: 'Invalid accessToken' }, { status: 401 });
    }

    // Extract metadata
    const metadata = payload?.metadata || {};
    const role = metadata.role;
    if (!role) {
      return NextResponse.json({ error: 'Missing role in token metadata' }, { status: 400 });
    }

    // Get roomName from query param
    const roomName = request.nextUrl.searchParams.get('roomName');
    if (!roomName) {
      return NextResponse.json({ error: 'Missing roomName query param' }, { status: 400 });
    }

    if (role === 'host') {
      return NextResponse.json({ message: 'Host verified', metadata }, { status: 200 });
    }

    // If role is participant, check if room exists
    if (role === 'participant') {
      if (!process.env.LIVEKIT_URL || !process.env.LIVEKIT_API_KEY || !process.env.LIVEKIT_API_SECRET) {
        return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
      }
      const roomService = new RoomServiceClient(
        process.env.LIVEKIT_URL,
        process.env.LIVEKIT_API_KEY,
        process.env.LIVEKIT_API_SECRET
      );
      try {
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        const rooms = await roomService.listRooms([roomName]);
        if (rooms && rooms.length > 0) {
          return NextResponse.json({ message: 'Room exists', metadata }, { status: 200 });
        } else {
          return NextResponse.json({ error: 'Room does not exist' }, { status: 404 });
        }
      } catch (error) {
        return NextResponse.json({ error: 'Failed to check room existence', details: error instanceof Error ? error.message : error }, { status: 500 });
      }
    }

    // If role is neither host nor participant
    return NextResponse.json({ error: 'Invalid role' }, { status: 403 });
  } catch (error) {
    return NextResponse.json({ error: 'Unexpected error', details: error instanceof Error ? error.message : error }, { status: 500 });
  }
}
