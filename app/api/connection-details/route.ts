import { randomString } from '@/lib/client-utils';
import { ConnectionDetails } from '@/lib/types';
import { AccessToken, AccessTokenOptions, VideoGrant, RoomServiceClient } from 'livekit-server-sdk';
import { NextRequest, NextResponse } from 'next/server';
import { jwtDecode } from 'jwt-decode';
import { isKicked } from '@/lib/blackList';

const API_KEY = process.env.LIVEKIT_API_KEY;
const API_SECRET = process.env.LIVEKIT_API_SECRET;
const LIVEKIT_URL = process.env.LIVEKIT_URL;
const COOKIE_KEY = 'participantToken';
const jwtExpiryHours = 12;

async function roomExists(roomName: String) {
  const roomService = new RoomServiceClient(LIVEKIT_URL + "", API_KEY, API_SECRET);

  try {
    const rooms = await roomService.listRooms();
    const exists = rooms.some(room => room.name === roomName);
    return exists;
  } catch (error) {
    console.error('Failed to list rooms:', error);
    return false;
  }
}

function decodeParticipantToken(token: string) {
  try {
    const decoded = jwtDecode(token);
    return decoded;
  } catch (error) {
    throw new Error('Failed to decode participant token');
  }
}

export async function GET(request: NextRequest) {
  try {
    const where = request.nextUrl.searchParams.get('where');
    const roomName = request.nextUrl.searchParams.get('roomName');
    const participantName = request.nextUrl.searchParams.get('participantName');
    const metadata = request.nextUrl.searchParams.get('metadata') ?? '';
    const region = request.nextUrl.searchParams.get('region');
    const livekitServerUrl = region ? getLiveKitURL(region) : LIVEKIT_URL;

    let currentParticipantToken = request.cookies.get(COOKIE_KEY)?.value;

    if(where !== "dashboard" && !(await roomExists(roomName + ""))) {
      return new NextResponse('Meeting does not exist', { status: 400 });
    }

    if (livekitServerUrl === undefined) {
      throw new Error('Invalid region');
    }

    if (typeof roomName !== 'string') {
      return new NextResponse('Missing required query parameter: roomName', { status: 400 });
    }
    if (participantName === null) {
      return new NextResponse('Missing required query parameter: participantName', { status: 400 });
    }

    let decodedToken = null;
    if (currentParticipantToken) {
      try {
        decodedToken = decodeParticipantToken(currentParticipantToken);
      } catch (error) {
        console.warn('Failed to decode current participant token:', error);
        currentParticipantToken = undefined;
      }
    }

    if(isKicked(decodedToken?.sub + "")) {
      return new NextResponse(JSON.stringify({}), {
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    // @ts-ignore
    if(currentParticipantToken && decodedToken && decodedToken.video.room === roomName) {
      const data: ConnectionDetails = {
        serverUrl: livekitServerUrl,
        roomName: roomName,
        participantToken: currentParticipantToken,
        participantName: participantName,
      };

      return new NextResponse(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json' },
      });
    } else {
      // Check if room exists and get participant count
      const roomService = new RoomServiceClient(livekitServerUrl, API_KEY, API_SECRET);
      let isFirstParticipant = false;

      try {
        const rooms = await roomService.listRooms([roomName]);
        isFirstParticipant = rooms.length === 0 || rooms[0].numParticipants === 0;
      } catch (error) {
        // Room doesn't exist yet, this is the first participant
        isFirstParticipant = true;
      }

      let randomParticipantPostfix = '';
      if (!currentParticipantToken) {
        randomParticipantPostfix = randomString(4);
      }

      // Set role based on whether this is the first participant
      const role = isFirstParticipant ? 'host' : 'participant';
      const userMetadata = JSON.stringify({ role, ...JSON.parse(metadata || '{}') });

      const participantToken = await createParticipantToken(
        {
          identity: `${participantName}__${randomParticipantPostfix}`,
          name: participantName,
          metadata: userMetadata,
        },
        roomName,
      );

      // Return connection details
      const data: ConnectionDetails = {
        serverUrl: livekitServerUrl,
        roomName: roomName,
        participantToken: participantToken,
        participantName: participantName,
      };

      return new NextResponse(JSON.stringify(data), {
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': `${COOKIE_KEY}=${participantToken}; Path=/; HttpOnly; SameSite=Strict; Secure; Expires=${getCookieExpirationTime()}`,
        },
      });
    }
  } catch (error) {
    if (error instanceof Error) {
      return new NextResponse(error.message, { status: 500 });
    }
  }
}

function createParticipantToken(userInfo: AccessTokenOptions, roomName: string) {
  const at = new AccessToken(API_KEY, API_SECRET, userInfo);
  at.ttl = jwtExpiryHours + "h";
  const grant: VideoGrant = {
    room: roomName,
    roomJoin: true,
    canPublish: true,
    canPublishData: true,
    canSubscribe: true,
  };
  at.addGrant(grant);
  return at.toJwt();
}

/**
 * Get the LiveKit server URL for the given region.
 */
function getLiveKitURL(region: string | null): string {
  let targetKey = 'LIVEKIT_URL';
  if (region) {
    targetKey = `LIVEKIT_URL_${region}`.toUpperCase();
  }
  const url = process.env[targetKey];
  if (!url) {
    throw new Error(`${targetKey} is not defined`);
  }
  return url;
}

function getCookieExpirationTime(): string {
  var now = new Date();
  var time = now.getTime();
  var expireTime = time + (jwtExpiryHours*60) * 60 * 1000;
  now.setTime(expireTime);
  return now.toUTCString();
}
