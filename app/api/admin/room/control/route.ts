import { NextResponse } from 'next/server';
import { RoomServiceClient } from 'livekit-server-sdk';
import { verifyRole } from '@/lib/auth/verifyRole';

const wsUrl = process.env.LIVEKIT_URL!;
const apiUrl = wsUrl.replace(/^wss?/, 'https');
const client = new RoomServiceClient(apiUrl, process.env.LIVEKIT_API_KEY!, process.env.LIVEKIT_API_SECRET!);

export async function POST(req: Request) {
  try {
    const { roomName, action, participantId, value, targetParticipantId } = await req.json();
    const roleCheck = await verifyRole(req as any, ['admin', 'host', 'co-host']);
    if (roleCheck) return roleCheck;

    switch (action) {
      case 'startRecording':
      case 'stopRecording':
        await client.updateRoomMetadata(roomName, JSON.stringify({ recording: action === 'startRecording' }));
        return NextResponse.json({ success: true });

      case 'mute':
        if (!participantId) return NextResponse.json({ error: 'No participant specified' }, { status: 400 });
        await client.updateParticipant(roomName, participantId, undefined, { canPublish: !value });
        return NextResponse.json({ success: true, message: `Participant ${value ? 'muted' : 'unmuted'}` });

      case 'kick':
        await client.removeParticipant(roomName, participantId);
        return NextResponse.json({ success: true });

      case 'rename':
        await client.updateParticipant(roomName, participantId, { name: value });
        return NextResponse.json({ success: true });

      case 'allowScreenShare':
        await client.updateParticipant(roomName, participantId, JSON.stringify({ screenShareAllowed: value }));
        return NextResponse.json({ success: true });

      case 'transferHost':
        await client.updateParticipant(roomName, targetParticipantId, JSON.stringify({ role: 'host' }));
        return NextResponse.json({ success: true });

      case 'putInWaitingRoom':
        await client.updateParticipant(roomName, participantId, undefined, {
          canSubscribe: false,
          canPublish: false,
        });
        return NextResponse.json({ success: true });

      case 'report':
        console.log(`Report submitted for participant ${participantId}:`, value);
        return NextResponse.json({ success: true, message: 'Report logged' });

      case 'raiseHand':
        if (!participantId) return NextResponse.json({ error: 'No participant specified' }, { status: 400 });
        
        await client.updateParticipant(roomName, participantId, undefined, undefined, JSON.stringify({ handRaised: value }));
        return NextResponse.json({ success: true, message: `Hand ${value ? 'raised' : 'lowered'}` });

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (err: any) {
    console.error('Room control error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}