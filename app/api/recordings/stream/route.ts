import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import os from 'os';

export async function POST(req: NextRequest) {
  const url = new URL(req.url!);
  const recordingId = url.searchParams.get('recordingId');
  const userId = url.searchParams.get('userId');
  const roomName = url.searchParams.get('roomName');
  const timestamp = url.searchParams.get('timestamp');
  if (!recordingId || !userId || !roomName || !timestamp) {
    return NextResponse.json({ error: 'Missing required params' }, { status: 400 });
  }

  // Get chunk index from query or generate
  const chunkIndex = url.searchParams.get('chunkIndex') || Date.now().toString();

  // Read binary body
  const arrayBuffer = await req.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Save chunk using cross-platform temp directory
  const dir = path.join(os.tmpdir(), 'recordings', recordingId);
  fs.mkdirSync(dir, { recursive: true });
  const chunkPath = path.join(dir, `chunk_${chunkIndex}.webm`);
  fs.writeFileSync(chunkPath, buffer);

  return NextResponse.json({ success: true });
} 