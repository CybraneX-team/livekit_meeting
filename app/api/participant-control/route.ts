import { RoomServiceClient } from 'livekit-server-sdk';
import { Track } from 'livekit-client';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { roomName, participantIdentity, action } = await req.json();
    console.log('Received control request:', { roomName, participantIdentity, action });
    
    if (!roomName || !participantIdentity || !action) {
      console.error('Missing required fields:', { roomName, participantIdentity, action });
      return NextResponse.json(
        { error: 'Missing required fields', details: { roomName, participantIdentity, action } },
        { status: 400 }
      );
    }

    if (!process.env.LIVEKIT_URL || !process.env.LIVEKIT_API_KEY || !process.env.LIVEKIT_API_SECRET) {
      console.error('Missing LiveKit credentials');
      return NextResponse.json(
        { error: 'Server configuration error', details: 'Missing LiveKit credentials' },
        { status: 500 }
      );
    }

    console.log('LiveKit credentials:', {
      url: process.env.LIVEKIT_URL,
      hasApiKey: !!process.env.LIVEKIT_API_KEY,
      hasApiSecret: !!process.env.LIVEKIT_API_SECRET
    });

    const roomService = new RoomServiceClient(
      process.env.LIVEKIT_URL,
      process.env.LIVEKIT_API_KEY,
      process.env.LIVEKIT_API_SECRET
    );

    // Get the participant's SID
    console.log('Listing participants in room:', roomName);
    let participants;
    try {
      participants = await roomService.listParticipants(roomName);
      console.log('Found participants:', participants.map(p => ({ 
        identity: p.identity, 
        sid: p.sid,
        metadata: p.metadata
      })));
    } catch (error) {
      console.error('Error listing participants:', error);
      return NextResponse.json(
        { error: 'Failed to list participants', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      );
    }
    
    const participant = participants.find(p => p.identity === participantIdentity);
    
    if (!participant) {
      console.error('Participant not found:', { 
        participantIdentity, 
        availableParticipants: participants.map(p => p.identity)
      });
      return NextResponse.json(
        { 
          error: 'Participant not found',
          details: {
            participantIdentity,
            availableParticipants: participants.map(p => p.identity)
          }
        },
        { status: 404 }
      );
    }

    console.log('Found participant:', { 
      sid: participant.sid, 
      identity: participant.identity,
      metadata: participant.metadata
    });

    try {
      if (action === 'mute-audio') {
        console.log('Muting audio for participant:', participantIdentity);
        await roomService.mutePublishedTrack(roomName, participantIdentity, Track.Source.Microphone, true);
      } else if (action === 'unmute-audio') {
        console.log('Unmuting audio for participant:', participantIdentity);
        await roomService.mutePublishedTrack(roomName, participantIdentity, Track.Source.Microphone, false);
      } else if (action === 'mute-video') {
        console.log('Muting video for participant:', participantIdentity);
        await roomService.mutePublishedTrack(roomName, participantIdentity, Track.Source.Camera, true);
      } else if (action === 'unmute-video') {
        console.log('Unmuting video for participant:', participantIdentity);
        await roomService.mutePublishedTrack(roomName, participantIdentity, Track.Source.Camera, false);
      } else {
        console.error('Invalid action:', action);
        return NextResponse.json(
          { error: 'Invalid action', details: { action } },
          { status: 400 }
        );
      }
    } catch (error) {
      console.error('Error controlling participant track:', error);
      return NextResponse.json(
        { 
          error: 'Failed to control participant track',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error controlling participant:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 