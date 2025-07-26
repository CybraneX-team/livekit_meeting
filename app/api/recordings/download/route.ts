import { NextRequest } from 'next/server';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

const BUCKET = process.env.AWS_S3_BUCKET!;
const REGION = process.env.AWS_REGION!;
const s3 = new S3Client({ region: REGION });

export async function GET(req: NextRequest) {
  const url = new URL(req.url!);
  const key = url.searchParams.get('key');
  if (!key) {
    return new Response('Missing key', { status: 400 });
  }

  try {
    // Download .webm from S3 into memory
    const s3Obj = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
    if (!s3Obj.Body) throw new Error('No body in S3 response');
    const s3Stream = s3Obj.Body as NodeJS.ReadableStream;
    const chunks: Buffer[] = [];
    for await (const chunk of s3Stream) {
      if (typeof chunk === 'string') {
        chunks.push(Buffer.from(chunk, 'utf8'));
      } else {
        chunks.push(Buffer.from(chunk));
      }
    }
    const webmBuffer = Buffer.concat(chunks);
    console.log('Download: WebM buffer size:', webmBuffer.length);

    // Return WebM file directly - modern browsers support WebM playback
    return new Response(webmBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'video/webm',
        'Content-Disposition': `attachment; filename="${key}"`,
        'Content-Length': webmBuffer.length.toString(),
      },
    });
  } catch (err: any) {
    if (err.name === 'NoSuchKey') {
      return new Response('Not found', { status: 404 });
    }
    return new Response(`Internal server error: ${err.message}`, { status: 500 });
  }
}

 