import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import os from 'os';
import ffmpeg from 'fluent-ffmpeg';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const BUCKET = process.env.AWS_S3_BUCKET!;
const REGION = process.env.AWS_REGION!;
const s3 = new S3Client({ region: REGION });

// Set ffmpeg path to the actual location in node_modules
const ffmpegPath = path.join(process.cwd(), 'node_modules', 'ffmpeg-static', 'ffmpeg.exe');
console.log('ffmpegPath:', ffmpegPath, 'exists:', fs.existsSync(ffmpegPath));
ffmpeg.setFfmpegPath(ffmpegPath);

function getOutputFileName(userId: string, roomName: string, timestamp: string, recordingId: string, recordingName?: string) {
  let base = `${userId}_${roomName}_${timestamp}_${recordingId}`;
  if (recordingName) {
    // Sanitize recordingName for filename
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
  
  // Use cross-platform temp directory
  const dir = path.join(os.tmpdir(), 'recordings', recordingId);
  console.log('Recording directory:', dir, 'exists:', fs.existsSync(dir));
  
  if (!fs.existsSync(dir)) {
    return NextResponse.json({ error: 'No such recording' }, { status: 404 });
  }
  
  const files = fs.readdirSync(dir)
    .filter(f => f.endsWith('.webm'))
    .sort();
  console.log('Found chunk files:', files);
  
  if (files.length === 0) {
    return NextResponse.json({ error: 'No chunks found' }, { status: 400 });
  }
  
  // Create ffmpeg input file list
  const fileListPath = path.join(dir, 'inputs.txt');
  const fileListContent = files.map(f => `file '${path.join(dir, f).replace(/'/g, "'\\''")}'`).join('\n');
  console.log('Writing inputs.txt to:', fileListPath);
  console.log('Input file content:', fileListContent);
  
  fs.writeFileSync(fileListPath, fileListContent);
  
  const outputFile = path.join(dir, getOutputFileName(userId, roomName, timestamp, recordingId, recordingName));
  console.log('Output file path:', outputFile);
  
  // Concatenate using ffmpeg
  await new Promise((resolve, reject) => {
    ffmpeg()
      .input(fileListPath)
      .inputOptions(['-f', 'concat', '-safe', '0'])
      .outputOptions(['-c', 'copy'])
      .output(outputFile)
      .on('end', () => {
        console.log('FFmpeg finished successfully');
        resolve(null);
      })
      .on('error', (err) => {
        console.error('FFmpeg error:', err);
        reject(err);
      })
      .run();
  });
  
  // Upload to S3
  const fileStream = fs.createReadStream(outputFile);
  const s3Key = getOutputFileName(userId, roomName, timestamp, recordingId, recordingName);
  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: s3Key,
    Body: fileStream,
    ContentType: 'video/webm',
  }));
  
  // Clean up temp files
  fs.rmSync(dir, { recursive: true, force: true });
  const s3Url = `https://${BUCKET}.s3.${REGION}.amazonaws.com/${s3Key}`;
  return NextResponse.json({ success: true, url: s3Url, recordingName });
} 