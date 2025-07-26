import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

const BUCKET = process.env.AWS_S3_BUCKET!;
const REGION = process.env.AWS_REGION!;
const s3 = new S3Client({ region: REGION });

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

  // Debug: Log chunk storage
  console.log('Stream: recordingId:', recordingId);
  console.log('Stream: chunk size:', buffer.length);

  // Store chunk in S3 with unique key
  const chunkKey = `chunks/${recordingId}/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.webm`;
  
  try {
    await s3.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: chunkKey,
      Body: buffer,
      ContentType: 'video/webm',
    }));
    console.log('Stream: Stored chunk in S3:', chunkKey);
  } catch (error) {
    console.error('Stream: Failed to store chunk in S3:', error);
    return NextResponse.json({ error: 'Failed to store chunk' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
} 