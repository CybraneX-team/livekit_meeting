import { NextRequest, NextResponse } from 'next/server';
import { S3Client, AbortMultipartUploadCommand } from '@aws-sdk/client-s3';

const BUCKET = process.env.AWS_S3_BUCKET!;
const REGION = process.env.AWS_REGION!;
const s3 = new S3Client({ region: REGION });

export async function POST(req: NextRequest) {
  try {
    const { uploadId, key } = await req.json();
    
    if (!uploadId || !key) {
      return NextResponse.json({ error: 'Missing uploadId or key' }, { status: 400 });
    }

    console.log('Multipart: Aborting upload:', { uploadId, key });

    const abortCommand = new AbortMultipartUploadCommand({
      Bucket: BUCKET,
      Key: key,
      UploadId: uploadId
    });

    await s3.send(abortCommand);
    
    console.log('Multipart: Successfully aborted upload');

    return NextResponse.json({
      success: true,
      message: 'Upload aborted successfully'
    });

  } catch (error) {
    console.error('Multipart: Error aborting upload:', error);
    return NextResponse.json({ error: 'Failed to abort upload' }, { status: 500 });
  }
} 