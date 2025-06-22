import { randomString } from '@/lib/client-utils';
import { ConnectionDetails } from '@/lib/types';
import { AccessToken, AccessTokenOptions, VideoGrant, RoomServiceClient } from 'livekit-server-sdk';
import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { isKicked } from '@/lib/blackList';

// Constants
const API_KEY = process.env.LIVEKIT_API_KEY;
const API_SECRET = process.env.LIVEKIT_API_SECRET;
const LIVEKIT_URL = process.env.LIVEKIT_URL;
const JWT_SECRET = process.env.JWT_SECRET || '';
const COOKIE_KEY = 'participantToken';
const JWT_EXPIRY_HOURS = 12;
const RANDOM_SUFFIX_LENGTH = 4;

// Types
interface AccessTokenPayload {
  role: string;
  iat: number;
  exp: number;
  metadata?: {
    role: string;
    [key: string]: any;
  };
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
  if (!JWT_SECRET) {
    throw new LiveKitAPIError('Missing required environment variable: JWT_SECRET');
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
 * Verifies and decodes the access token using jsonwebtoken
 */
function verifyAccessToken(token: string): AccessTokenPayload | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET, {
      algorithms: ['HS256']
    }) as AccessTokenPayload;
    return payload;
  } catch (error) {
    console.warn('Failed to verify access token:', error);
    return null;
  }
}

/**
 * Creates a new access token with participant role
 */
function createAccessToken(): string {
  const payload = {
    metadata: {
      role: 'participant'
    }
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: '24h',
    algorithm: 'HS256'
  });
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
 * Validates required query parameters
 */
function validateQueryParams(request: NextRequest): QueryParams {
  const params = {
    roomName: request.nextUrl.searchParams.get('roomName'),
    participantName: request.nextUrl.searchParams.get('participantName'),
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
function validateUserAccess(accessToken: string): void {   
  if (isKicked(accessToken)) {
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
    const { roomName, participantName, region } = validateQueryParams(request);
    
    const livekitServerUrl = getLiveKitURL(region);

    const accessTokenFromCookie = request.cookies.get("accessToken")?.value;
    
    let verifiedToken: AccessTokenPayload | null = null;
    let newAccessToken: string | null = null;
    let setCookieHeader: string | undefined;

    // Try to verify existing token
    if (accessTokenFromCookie) {
      verifiedToken = verifyAccessToken(accessTokenFromCookie);
    }

    // If no valid token, create a new one
    if (!verifiedToken) {
      newAccessToken = createAccessToken();
      verifiedToken = verifyAccessToken(newAccessToken);
      
      // Set cookie header for new token
      setCookieHeader = `accessToken=${newAccessToken}; HttpOnly; Secure; SameSite=strict; Path=/`;
    }

    // Get metadata from verified token
    const metadata = verifiedToken?.metadata || { role: 'participant' };

    // Validate user access (using the token string for blacklist check)
    const tokenForValidation = newAccessToken || accessTokenFromCookie!;
    validateUserAccess(tokenForValidation);

    const randomSuffix = randomString(RANDOM_SUFFIX_LENGTH);

    const participantToken = await createParticipantToken(
      {
        identity: `${participantName}__${randomSuffix}`,
        name: participantName,
        metadata: JSON.stringify(metadata),
      },
      roomName
    );

    return createConnectionResponse(
      livekitServerUrl,
      roomName,
      participantToken,
      participantName,
      setCookieHeader
    );

  } catch (error) {
    console.error('LiveKit API Error:', error);
    
    if (error instanceof LiveKitAPIError) {
      return new NextResponse(error.message, { status: error.statusCode });
    }
    
    return new NextResponse('Internal server error', { status: 500 });
  }
}