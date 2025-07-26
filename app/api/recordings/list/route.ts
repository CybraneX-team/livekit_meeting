import { NextRequest, NextResponse } from 'next/server';
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';

const BUCKET = process.env.AWS_S3_BUCKET!;
const REGION = process.env.AWS_REGION!;
const s3 = new S3Client({ region: REGION });

function parseFileName(key: string) {
  // {userId}_{roomName}_{timestamp}_{recordingId}[__recordingName].webm
  const match = key.match(/^(.+?)_(.+?)_(\d+)_(.+?)(?:__(.+?))?\.webm$/);
  if (!match) return null;
  const [, userId, roomName, timestamp, recordingId, recordingName] = match;
  return { userId, roomName, timestamp, recordingId, recordingName };
}

export async function GET(req: NextRequest) {
  const list = await s3.send(new ListObjectsV2Command({ Bucket: BUCKET }));
  const recordings = (list.Contents || [])
    .filter(obj => obj.Key && obj.Key.endsWith('.webm'))
    .map(obj => {
      const meta = parseFileName(obj.Key!);
      if (!meta) return null;
      return {
        url: `https://${BUCKET}.s3.${REGION}.amazonaws.com/${obj.Key}`,
        key: obj.Key,
        ...meta,
      };
    })
    .filter(Boolean)
    .sort((a, b) => Number(b?.timestamp) - Number(a?.timestamp));
  return NextResponse.json({ recordings });
} 