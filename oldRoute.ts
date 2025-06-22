import { randomString } from '@/lib/client-utils';
import { ConnectionDetails } from '@/lib/types';
import { AccessToken, AccessTokenOptions, VideoGrant, RoomServiceClient } from 'livekit-server-sdk';
import { NextRequest, NextResponse } from 'next/server';
import { jwtDecode, JwtPayload } from 'jwt-decode';
import { isKicked } from '@/lib/blackList';

// Constants
const API_KEY = process.env.LIVEKIT_API_KEY;
const API_SECRET = process.env.LIVEKIT_API_SECRET;
const LIVEKIT_URL = process.env.LIVEKIT_URL;
const COOKIE_KEY = 'participantToken';
const JWT_EXPIRY_HOURS = 12;
const RANDOM_SUFFIX_LENGTH = 4;

// Types
interface DecodedParticipantToken extends JwtPayload {
  sub?: string;
  video?: {
    room?: string;
  };
}

interface RoomInfo {
  exists: boolean;
  isFirstParticipant: boolean;
}

interface ParticipantMetadata {
  role: 'host' | 'participant';
  [key: string]: any;
}

// Custom Error Classes
class LiveKitAPIError extends Error {
  constructor(message: string, public statusCode: number = 500) {
    super(message);
    this.name = 'LiveKitAPIError';
  }
}

class ValidationError extends LiveKitAPIError {
  constructor(message: string) {
    super(message, 400);
    this.name = 'ValidationError';
  }
}

type QueryParams = {
  where: string | null;
  roomName: string;
  participantName: string;
  metadata: string;
  region: string | null;
};


/**
 * Validates required environment variables
 */
function validateEnvironment(): void {
  if (!API_KEY || !API_SECRET || !LIVEKIT_URL) {
    throw new LiveKitAPIError('Missing required environment variables: LIVEKIT_API_KEY, LIVEKIT_API_SECRET, or LIVEKIT_URL');
  }
}

/**
 * Gets the LiveKit server URL for the given region
 */
function getLiveKitURL(region?: string | null): string {
  const targetKey = region ? `LIVEKIT_URL_${region.toUpperCase()}` : 'LIVEKIT_URL';
  const url = process.env[targetKey];
  
  if (!url) {
    throw new ValidationError(`Environment variable ${targetKey} is not defined`);
  }
  
  return url;
}

/**
 * Creates a room service client with proper error handling
 */
function createRoomService(serverUrl: string): RoomServiceClient {
  if (!API_KEY || !API_SECRET) {
    throw new LiveKitAPIError('API credentials not configured');
  }
  
  return new RoomServiceClient(serverUrl, API_KEY, API_SECRET);
}

/**
 * Checks if room exists and determines if this would be the first participant
 */
async function getRoomInfo(roomName: string, serverUrl: string): Promise<RoomInfo> {
  const roomService = createRoomService(serverUrl);
  
  try {
    const rooms = await roomService.listRooms([roomName]);
    const room = rooms.find(r => r.name === roomName);
    
    return {
      exists: !!room,
      isFirstParticipant: !room || room.numParticipants === 0
    };
  } catch (error) {
    console.error('Failed to get room info:', error);
    // If we can't get room info, assume it doesn't exist and this is the first participant
    return {
      exists: false,
      isFirstParticipant: true
    };
  }
}

/**
 * Safely decodes a participant token
 */
function decodeParticipantToken(token: string): DecodedParticipantToken | null {
  try {
    return jwtDecode<DecodedParticipantToken>(token);
  } catch (error) {
    console.warn('Failed to decode participant token:', error);
    return null;
  }
}

/**
 * Creates a participant token with the given user info and room name
 */
const createParticipantToken = async (userInfo: AccessTokenOptions, roomName: string): Promise<string> => {
  if (!API_KEY || !API_SECRET) {
    throw new LiveKitAPIError('API credentials not configured');
  }

  const accessToken = new AccessToken(API_KEY, API_SECRET, userInfo);
  accessToken.ttl = `${JWT_EXPIRY_HOURS}h`;
  
  const grant: VideoGrant = {
    room: roomName,
    roomJoin: true,
    canPublish: true,
    canPublishData: true,
    canSubscribe: true,
  };
  
  accessToken.addGrant(grant);
  return await accessToken.toJwt();
}

/**
 * Generates cookie expiration time
 */
function getCookieExpirationTime(): string {
  const now = new Date();
  const expireTime = now.getTime() + (JWT_EXPIRY_HOURS * 60 * 60 * 1000);
  return new Date(expireTime).toUTCString();
}

/**
 * Validates required query parameters
 */
function validateQueryParams(request: NextRequest): QueryParams {
  const params = {
    where: request.nextUrl.searchParams.get('where'),
    roomName: request.nextUrl.searchParams.get('roomName'),
    participantName: request.nextUrl.searchParams.get('participantName'),
    metadata: request.nextUrl.searchParams.get('metadata') ?? '{}',
    region: request.nextUrl.searchParams.get('region'),
  };

  if (!params.roomName) {
    throw new ValidationError('Missing required query parameter: roomName');
  }

  if (!params.participantName) {
    throw new ValidationError('Missing required query parameter: participantName');
  }

  return params as QueryParams;
}

/**
 * Checks if user is banned/kicked
 */
function validateUserAccess(decodedToken: DecodedParticipantToken | null): void {
  const userId = decodedToken?.sub ?? '';
  
  if (isKicked(userId)) {
    throw new LiveKitAPIError('User access denied', 403);
  }
}

/**
 * Creates connection details response
 */
function createConnectionResponse(
  serverUrl: string,
  roomName: string,
  participantToken: string,
  participantName: string,
  setCookie?: string
): NextResponse {
  const data: ConnectionDetails = {
    serverUrl,
    roomName,
    participantToken,
    participantName,
  };

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (setCookie) {
    headers['Set-Cookie'] = setCookie;
  }

  return new NextResponse(JSON.stringify(data), { headers });
}

/**
 * Main GET handler
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Validate environment and query parameters
    validateEnvironment();
    const { where, roomName, participantName, metadata, region } = validateQueryParams(request);
    
    const livekitServerUrl = getLiveKitURL(region);
    const currentParticipantToken = request.cookies.get(COOKIE_KEY)?.value;

    // Check if room exists (skip for dashboard)
    if (where !== "dashboard") {
      const roomInfo = await getRoomInfo(roomName, livekitServerUrl);
      if (!roomInfo.exists) {
        throw new ValidationError('Meeting does not exist');
      }
    }

    // Decode and validate current token
    const decodedToken = currentParticipantToken 
      ? decodeParticipantToken(currentParticipantToken) 
      : null;

    console.log(decodedToken);

    validateUserAccess(decodedToken);

    // Check if we can reuse the existing token
    if (currentParticipantToken && 
        decodedToken?.video?.room === roomName) {
      
      return createConnectionResponse(
        livekitServerUrl,
        roomName,
        currentParticipantToken,
        participantName
      );
    }

    // Create new token
    const roomInfo = await getRoomInfo(roomName, livekitServerUrl);
    const randomSuffix = randomString(RANDOM_SUFFIX_LENGTH);
    
    const role: 'host' | 'participant' = roomInfo.isFirstParticipant ? 'host' : 'participant';
    
    let parsedMetadata: Record<string, any> = {};
    try {
      parsedMetadata = JSON.parse(metadata);
    } catch (error) {
      console.warn('Invalid metadata JSON, using empty object:', error);
    }

    const userMetadata: ParticipantMetadata = {
      role,
      ...parsedMetadata
    };

    const participantToken = await createParticipantToken(
      {
        identity: `${participantName}__${randomSuffix}`,
        name: participantName,
        metadata: JSON.stringify(userMetadata),
      },
      roomName
    );

    const cookieValue = `${COOKIE_KEY}=${participantToken}; Path=/; HttpOnly; SameSite=Strict; Secure; Expires=${getCookieExpirationTime()}`;

    return createConnectionResponse(
      livekitServerUrl,
      roomName,
      participantToken,
      participantName,
      cookieValue
    );

  } catch (error) {
    console.error('LiveKit API Error:', error);
    
    if (error instanceof LiveKitAPIError) {
      return new NextResponse(error.message, { status: error.statusCode });
    }
    
    return new NextResponse('Internal server error', { status: 500 });
  }
}