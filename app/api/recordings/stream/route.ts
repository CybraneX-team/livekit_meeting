import { NextRequest, NextResponse } from 'next/server';

// In-memory chunk storage: Map<recordingId, Buffer[]>
const globalAny = global as any;
if (!globalAny.__recordingChunks) globalAny.__recordingChunks = new Map();
const recordingChunks: Map<string, Buffer[]> = globalAny.__recordingChunks;

export async function POST(req: NextRequest) {
  const url = new URL(req.url!);
  const recordingId = url.searchParams.get('recordingId');
  const userId = url.searchParams.get('userId');
  const roomName = url.searchParams.get('roomName');
  const timestamp = url.searchParams.get('timestamp');
  if (!recordingId || !userId || !roomName || !timestamp) {
    return NextResponse.json({ error: 'Missing required params' }, { status: 400 });
  }

  // Read binary body
  const arrayBuffer = await req.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Store chunk in memory
  if (!recordingChunks.has(recordingId)) {
    recordingChunks.set(recordingId, []);
  }
  recordingChunks.get(recordingId)!.push(buffer);

  return NextResponse.json({ success: true });
} 