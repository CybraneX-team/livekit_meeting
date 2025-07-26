import { NextRequest, NextResponse } from 'next/server';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';

const BUCKET = process.env.AWS_S3_BUCKET!;
const REGION = process.env.AWS_REGION!;
const s3 = new S3Client({ region: REGION });

export async function DELETE(req: NextRequest) {
  const url = new URL(req.url!);
  const key = url.searchParams.get('key');
  
  if (!key) {
    return NextResponse.json({ error: 'Missing key parameter' }, { status: 400 });
  }

  try {
    await s3.send(new DeleteObjectCommand({
      Bucket: BUCKET,
      Key: key,
    }));

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Delete error:', err);
    if (err.name === 'NoSuchKey') {
      return NextResponse.json({ error: 'Recording not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to delete recording' }, { status: 500 });
  }
} 