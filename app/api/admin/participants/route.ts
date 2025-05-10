import { NextRequest, NextResponse } from 'next/server';
import { verifyRole } from '@/lib/auth/verifyRole';
import { RoomServiceClient } from 'livekit-server-sdk';

const client = new RoomServiceClient(
  process.env.LIVEKIT_URL!.replace(/^ws/, 'http'),
  process.env.LIVEKIT_API_KEY!,
  process.env.LIVEKIT_API_SECRET!
);

export async function GET(req: NextRequest) {
    const auth = await verifyRole(req, ['admin', 'host', 'co-host']);
    if (auth) return auth;
  
    const roomName = req.nextUrl.searchParams.get('roomName');
    if (!roomName) {
      return NextResponse.json({ error: 'Missing roomName' }, { status: 400 });
    }
  
    try {
      const participants = await client.listParticipants(roomName);
      const simplified = participants.map(p => ({
        name: p.name,
        sid: p.sid,
        identity: p.identity,
        active: p.state
      }));
  
      return NextResponse.json({ participants: simplified });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Internal error' },
        { status: 500 }
      );
    }
  }