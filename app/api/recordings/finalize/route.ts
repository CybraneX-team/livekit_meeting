import { NextRequest, NextResponse } from 'next/server';
import ffmpeg from 'fluent-ffmpeg';
import { S3Client, PutObjectCommand, ListObjectsV2Command, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { PassThrough } from 'stream';

const BUCKET = process.env.AWS_S3_BUCKET!;
const REGION = process.env.AWS_REGION!;
const s3 = new S3Client({ region: REGION });
// Set FFmpeg path for different environments
let ffmpegPath: string;
if (process.platform === 'win32') {
  // Windows
  ffmpegPath = require('path').join(process.cwd(), 'node_modules', 'ffmpeg-static', 'ffmpeg.exe');
} else {
  // Linux/macOS (including Vercel)
  ffmpegPath = require('path').join(process.cwd(), 'node_modules', 'ffmpeg-static', 'ffmpeg');
}

// Debug FFmpeg path
console.log('FFmpeg path:', ffmpegPath);
console.log('Platform:', process.platform);
console.log('CWD:', process.cwd());

ffmpeg.setFfmpegPath(ffmpegPath);



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

  // Debug: Check recordingId
  console.log('Finalize: recordingId:', recordingId);
  
  // Get all chunks from S3
  const chunks: Buffer[] = [];
  try {
    // List all chunks for this recording
    const listResponse = await s3.send(new ListObjectsV2Command({
      Bucket: BUCKET,
      Prefix: `chunks/${recordingId}/`,
    }));
    
    console.log('Finalize: Found chunk objects:', listResponse.Contents?.length || 0);
    
    if (!listResponse.Contents || listResponse.Contents.length === 0) {
      return NextResponse.json({ error: 'No chunks found' }, { status: 400 });
    }
    
    // Download all chunks
    for (const obj of listResponse.Contents) {
      if (obj.Key) {
        const getResponse = await s3.send(new GetObjectCommand({
          Bucket: BUCKET,
          Key: obj.Key,
        }));
        
        if (getResponse.Body) {
          const stream = getResponse.Body as NodeJS.ReadableStream;
          const chunkChunks: Buffer[] = [];
          for await (const chunk of stream) {
            if (typeof chunk === 'string') {
              chunkChunks.push(Buffer.from(chunk, 'utf8'));
            } else {
              chunkChunks.push(Buffer.from(chunk));
            }
          }
          chunks.push(Buffer.concat(chunkChunks));
        }
      }
    }
    
    console.log('Finalize: Downloaded chunks:', chunks.length);
  } catch (error) {
    console.error('Finalize: Error retrieving chunks from S3:', error);
    return NextResponse.json({ error: 'Failed to retrieve chunks' }, { status: 500 });
  }
  
  if (chunks.length === 0) {
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

  // Clean up S3 chunks
  try {
    const listResponse = await s3.send(new ListObjectsV2Command({
      Bucket: BUCKET,
      Prefix: `chunks/${recordingId}/`,
    }));
    
    if (listResponse.Contents) {
      for (const obj of listResponse.Contents) {
        if (obj.Key) {
          await s3.send(new DeleteObjectCommand({
            Bucket: BUCKET,
            Key: obj.Key,
          }));
        }
      }
    }
    console.log('Finalize: Cleaned up S3 chunks for recordingId:', recordingId);
  } catch (error) {
    console.error('Finalize: Error cleaning up S3 chunks:', error);
    // Don't fail the request if cleanup fails
  }

  const s3Url = `https://${BUCKET}.s3.${REGION}.amazonaws.com/${outputFileName}`;
  return NextResponse.json({ success: true, url: s3Url, recordingName });
} 