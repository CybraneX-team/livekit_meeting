import { RoomServiceClient } from 'livekit-server-sdk';
import { Track } from 'livekit-client';
import { NextResponse } from 'next/server';
import { kickUser } from '@/lib/blackList';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { roomName, participantIdentity, action } = body;
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
      } else if (action === 'remove') {
        console.log('Removing participant:', participantIdentity);
        await roomService.removeParticipant(roomName, participantIdentity);
        kickUser(participantIdentity)
      } else if (action === 'rename') {
        const { newIdentity } = body;
        if (!newIdentity) {
          console.error('Missing new identity for rename action');
          return NextResponse.json(
            { error: 'Missing new identity', details: { newIdentity } },
            { status: 400 }
          );
        }
        console.log('Renaming participant:', { from: participantIdentity, to: newIdentity });
        await roomService.updateParticipant(roomName, participantIdentity, undefined, undefined, newIdentity);
      } else if (action === 'put-in-waiting-room') {
        console.log('Putting participant in waiting room:', participantIdentity);
        const metadata = JSON.stringify({ inWaitingRoom: true });
        // Restrict permissions in waiting room
        const permissions = {
          ...(participant.permission),
          canPublish: false,
          canSubscribe: false,
          canPublishData: false
        };
        await roomService.updateParticipant(roomName, participantIdentity, metadata, permissions);
      } else if (action === 'remove-from-waiting-room') {
        console.log('Removing participant from waiting room:', participantIdentity);
        const metadata = JSON.stringify({ inWaitingRoom: false });
        // Restore full permissions
        const permissions = {
          ...(participant.permission),
          canPublish: true,
          canSubscribe: true,
          canPublishData: true
        };
        await roomService.updateParticipant(roomName, participantIdentity, metadata, permissions);
      } else if (action === 'make-cohost') {
        console.log('Making participant co-host:', participantIdentity);
        const metadata = JSON.stringify({ role: 'co-host' });
        // Co-hosts get full permissions
        const permissions = {
          ...(participant.permission),
          canPublish: true,
          canSubscribe: true,
          canPublishData: true
        };
        await roomService.updateParticipant(roomName, participantIdentity, metadata, permissions);
      } else if (action === 'remove-cohost') {
        console.log('Removing co-host status from participant:', participantIdentity);
        const metadata = JSON.stringify({ role: 'participant' });
        // Regular participant permissions
        const permissions = {
          ...(participant.permission),
          canPublish: true,
          canSubscribe: true,
          canPublishData: true
        };
        await roomService.updateParticipant(roomName, participantIdentity, metadata, permissions);
      } else if (action === 'toggle-publishing') {
        const permissions = {
          ...participant.permission,
          canPublish: !participant.permission?.canPublish,
        };
        await roomService.updateParticipant(roomName, participantIdentity, undefined, permissions);
      } else if (action === 'mass-toggle-publishing') {
        const participants = await roomService.listParticipants(roomName);
        
        // Update all participants in parallel
        await Promise.all(participants.map(async (participant) => {
          const { role } = JSON.parse(participant.metadata);

          if(role === "host" || role === "co-host") return;
          if(participant.identity === participantIdentity) return;

          const permissions = {
            ...(participant.permission),
            canPublish: !(participant.permission?.canPublish),
          };
          await roomService.updateParticipant(roomName, participant.identity, undefined, permissions);
        }));
      } else if (action === 'mass-mute-audio' || action === 'mass-unmute-audio') {
        console.log(`${action} for all participants in room:`, roomName);
        const participants = await roomService.listParticipants(roomName);
        const shouldMute = action === 'mass-mute-audio';
        
        // Update all participants in parallel
        await Promise.all(participants.map(async (participant) => {
          const { role } = JSON.parse(participant.metadata || '{}');
          
          if(role === "host" || role === "co-host") return;
          if(participant.identity === participantIdentity) return;

          console.log(participant.tracks);
          console.log(Track.Source.Microphone)
          await roomService.mutePublishedTrack(roomName, participant.identity, (participant?.tracks.find((t) => t.source === 2))?.sid + "", shouldMute)
        }));
      } else if(action === 'mark-attendance') {
        let metadata = body.metadata;

        try {
          metadata = JSON.parse(body.metadata);
        } catch  {
          if(metadata === "") {
            metadata = {
              attendance: {
                participants: [],
                timeStamp: []
              }
            }
          } 
        }

        if(!metadata.attendance.participants.includes(participantIdentity)) {
          metadata.attendance.participants.push(participantIdentity);
          metadata.attendance.timeStamp.push(new Date())
          await roomService.updateRoomMetadata(roomName, JSON.stringify(metadata))
        }
      } else if (action === 'mass-mute-video' || action === 'mass-unmute-video') {
        console.log(`${action} for all participants in room:`, roomName);
        const participants = await roomService.listParticipants(roomName);
        const shouldMute = action === 'mass-mute-video';
        
        // Update all participants in parallel
        await Promise.all(participants.map(async (participant) => {
          const { role } = JSON.parse(participant.metadata || '{}');
          
          if(role === "host" || role === "co-host") return;
          if(participant.identity === participantIdentity) return;
          
          await roomService.mutePublishedTrack(roomName, participant.identity, (participant?.tracks.find((t) => t.source === 2))?.sid + "", shouldMute)
        }));
      } else if (action === 'destroy-room') {
        console.log('Destroying room:', roomName);
        await roomService.deleteRoom(roomName);
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