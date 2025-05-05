import { NextResponse } from 'next/server';
import { RoomServiceClient } from 'livekit-server-sdk';

const roomService = new RoomServiceClient(
  process.env.LIVEKIT_API_URL!,
  process.env.LIVEKIT_API_KEY!,
  process.env.LIVEKIT_API_SECRET!
);

export async function POST(request: Request) {
  try {
    const { roomName, action } = await request.json();

    if (!roomName || !action) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    if (action === 'start') {
      await roomService.startRecording(roomName);
    } else if (action === 'stop') {
      await roomService.stopRecording(roomName);
    } else {
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error handling recording request:', error);
    return NextResponse.json(
      { error: 'Failed to process recording request' },
      { status: 500 }
    );
  }
} 