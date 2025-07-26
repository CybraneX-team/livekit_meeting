import { NextRequest, NextResponse } from 'next/server';
import ffmpeg from 'fluent-ffmpeg';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { PassThrough } from 'stream';

const BUCKET = process.env.AWS_S3_BUCKET!;
const REGION = process.env.AWS_REGION!;
const s3 = new S3Client({ region: REGION });
const ffmpegPath = require('path').join(process.cwd(), 'node_modules', 'ffmpeg-static', 'ffmpeg.exe');
ffmpeg.setFfmpegPath(ffmpegPath);

// In-memory chunk storage: Map<recordingId, Buffer[]>
const globalAny = global as any;
if (!globalAny.__recordingChunks) globalAny.__recordingChunks = new Map();
const recordingChunks: Map<string, Buffer[]> = globalAny.__recordingChunks;

function getOutputFileName(userId: string, roomName: string, timestamp: string, recordingId: string, recordingName?: string) {
  let base = `${userId}_${roomName}_${timestamp}_${recordingId}`;
  if (recordingName) {
    const safeName = recordingName.replace(/[^a-zA-Z0-9-_]/g, '_');
    base += `__${safeName}`;
  }
  return `${base}.webm`;
}

export async function POST(req: NextRequest) {
  let data;
  const contentType = req.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    data = await req.json();
  } else if (contentType.includes('application/x-www-form-urlencoded')) {
    const form = await req.formData();
    data = Object.fromEntries(form.entries());
  } else {
    return NextResponse.json({ error: 'Unsupported content type' }, { status: 400 });
  }

  const { recordingId, userId, roomName, timestamp, recordingName } = data;
  if (!recordingId || !userId || !roomName || !timestamp) {
    return NextResponse.json({ error: 'Missing required params' }, { status: 400 });
  }

  // Get all chunks from memory
  const chunks = recordingChunks.get(recordingId);
  if (!chunks || chunks.length === 0) {
    return NextResponse.json({ error: 'No chunks found' }, { status: 400 });
  }

  const webmBuffer = Buffer.concat(chunks);
  const inputStream = new PassThrough();
  inputStream.end(webmBuffer);

  const ffmpegOutput = new PassThrough();
  const outputFileName = getOutputFileName(userId, roomName, timestamp, recordingId, recordingName);
  
  // Collect ffmpeg output in memory first
  const ffmpegChunks: Buffer[] = [];
  ffmpegOutput.on('data', (chunk) => {
    ffmpegChunks.push(Buffer.from(chunk));
  });
  
  await new Promise((resolve, reject) => {
    const ffmpegCommand = ffmpeg(inputStream)
      .inputFormat('webm')
      .outputOptions([
        '-c:v', 'libvpx-vp9',
        '-crf', '25',           // Better quality (25 instead of 35)
        '-b:v', '500k',         // Higher bitrate for text clarity
        '-deadline', 'realtime',
        '-cpu-used', '2',       // Better quality encoding
        '-c:a', 'libopus',
        '-b:a', '64k',          // Better audio quality
        '-ar', '44100',         // Standard audio sample rate
        '-ac', '1'              // Mono audio
      ])
      .format('webm')
      .on('end', () => {
        resolve(null);
      })
      .on('error', (err) => {
        reject(err);
      });
    
    ffmpegCommand.pipe(ffmpegOutput, { end: true });
  });
  
  // Create buffer from collected chunks for S3 upload
  const ffmpegBuffer = Buffer.concat(ffmpegChunks);

  // Upload to S3
  try {
    await s3.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: outputFileName,
      Body: ffmpegBuffer,
      ContentType: 'video/webm',
    }));
  } catch (s3Error) {
    throw s3Error;
  }

  // Clean up memory
  recordingChunks.delete(recordingId);

  const s3Url = `https://${BUCKET}.s3.${REGION}.amazonaws.com/${outputFileName}`;
  return NextResponse.json({ success: true, url: s3Url, recordingName });
} 