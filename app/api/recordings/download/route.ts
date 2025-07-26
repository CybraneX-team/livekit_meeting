import { NextRequest } from 'next/server';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs';
import path from 'path';
import os from 'os';
import ffmpeg from 'fluent-ffmpeg';
import { PassThrough } from 'stream';

const BUCKET = process.env.AWS_S3_BUCKET!;
const REGION = process.env.AWS_REGION!;
const s3 = new S3Client({ region: REGION });
const ffmpegPath = path.join(process.cwd(), 'node_modules', 'ffmpeg-static', 'ffmpeg.exe');
ffmpeg.setFfmpegPath(ffmpegPath);

export async function GET(req: NextRequest) {
  const url = new URL(req.url!);
  const key = url.searchParams.get('key');
  if (!key) {
    return new Response('Missing key', { status: 400 });
  }

  console.log('Download request for key:', key);

  // Download .webm from S3 to temp file
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'recording-download-'));
  const webmPath = path.join(tempDir, 'input.webm');
  const mp4Path = path.join(tempDir, 'output.mp4');

  try {
    console.log('Downloading from S3...');
    const s3Obj = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
    if (!s3Obj.Body) throw new Error('No body in S3 response');
    const s3Stream = s3Obj.Body as any;
    const writeStream = fs.createWriteStream(webmPath);

    await new Promise((resolve, reject) => {
      if (s3Stream.pipe) {
        s3Stream.pipe(writeStream);
        s3Stream.on('end', resolve);
        s3Stream.on('error', reject);
        writeStream.on('error', reject);
      } else if (s3Stream.transformToWebStream) {
        const reader = s3Stream.transformToWebStream().getReader();
        const pump = async () => {
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              writeStream.write(Buffer.from(value));
            }
            writeStream.end();
            resolve(null);
          } catch (err) {
            reject(err);
          }
        };
        pump();
      } else {
        reject(new Error('Unsupported S3 response body type'));
      }
    });

    console.log('S3 download complete, file size:', fs.statSync(webmPath).size);

    // Convert to mp4 using ffmpeg
    console.log('Starting ffmpeg conversion...');
    await new Promise((resolve, reject) => {
      ffmpeg(webmPath)
        .output(mp4Path)
        .outputOptions(['-c:v copy', '-c:a aac', '-movflags +faststart'])
        .on('start', (commandLine) => {
          console.log('FFmpeg command:', commandLine);
        })
        .on('progress', (progress) => {
          console.log('FFmpeg progress:', progress.percent, '%');
        })
        .on('end', () => {
          console.log('FFmpeg conversion complete');
          resolve(null);
        })
        .on('error', (err) => {
          console.error('FFmpeg error:', err);
          reject(err);
        })
        .run();
    });

    if (!fs.existsSync(mp4Path)) throw new Error('FFmpeg output file not found');
    console.log('MP4 file created, size:', fs.statSync(mp4Path).size);

    // Stream mp4 to client using PassThrough
    const stat = fs.statSync(mp4Path);
    const fileStream = fs.createReadStream(mp4Path);
    const pass = new PassThrough();
    fileStream.pipe(pass);

    // Clean up temp files after streaming
    pass.on('close', () => {
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
        console.log('Temp directory cleaned up');
      } catch (cleanupErr) {
        console.error('Cleanup error:', cleanupErr);
      }
    });

    return new Response(pass as any, {
      status: 200,
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Disposition': `attachment; filename="${path.basename(key, '.webm')}.mp4"`,
        'Content-Length': stat.size.toString(),
      },
    });
  } catch (err: any) {
    console.error('Download/convert error:', err);
    try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch {}
    if (err.name === 'NoSuchKey') {
      return new Response('Not found', { status: 404 });
    }
    return new Response(`Internal server error: ${err.message}`, { status: 500 });
  }
} 