import { NextRequest, NextResponse } from 'next/server';
import { S3Client, CreateMultipartUploadCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { UploadPartCommand } from '@aws-sdk/client-s3';

const BUCKET = process.env.AWS_S3_BUCKET!;
const REGION = process.env.AWS_REGION!;
const s3 = new S3Client({ region: REGION });

function getOutputFileName(userId: string, roomName: string, timestamp: string, recordingId: string, recordingName?: string) {
  let base = `${userId}_${roomName}_${timestamp}_${recordingId}`;
  if (recordingName) {
    const safeName = recordingName.replace(/[^a-zA-Z0-9-_]/g, '_');
    base += `__${safeName}`;
  }
  return `${base}.webm`;
}

export async function POST(req: NextRequest) {
  try {
    const { userId, roomName, timestamp, recordingId, recordingName, estimatedParts } = await req.json();
    
    if (!userId || !roomName || !timestamp || !recordingId) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const outputFileName = getOutputFileName(userId, roomName, timestamp, recordingId, recordingName);
    
    console.log('Multipart: Initiating upload for:', outputFileName);

    // 1. Initiate multipart upload
    const createMultipartCommand = new CreateMultipartUploadCommand({
      Bucket: BUCKET,
      Key: outputFileName,
      ContentType: 'video/webm',
      Metadata: {
        userId,
        roomName,
        timestamp,
        recordingId,
        recordingName: recordingName || '',
        uploadType: 'multipart'
      }
    });

    const { UploadId } = await s3.send(createMultipartCommand);
    
    if (!UploadId) {
      throw new Error('Failed to get upload ID');
    }

    console.log('Multipart: Created upload ID:', UploadId);

    // 2. Generate presigned URLs for all parts
    const presignedUrls: string[] = [];
    const maxParts = estimatedParts || 10; // Default to 10 parts, can be adjusted

    console.log('Multipart: Generating presigned URLs for', maxParts, 'parts');

    for (let partNumber = 1; partNumber <= maxParts; partNumber++) {
      const uploadPartCommand = new UploadPartCommand({
        Bucket: BUCKET,
        Key: outputFileName,
        UploadId,
        PartNumber: partNumber,
      });

      const presignedUrl = await getSignedUrl(s3, uploadPartCommand, { expiresIn: 3600 }); // 1 hour expiry
      presignedUrls.push(presignedUrl);
      
      console.log('Multipart: Generated presigned URL for part', partNumber, ':', presignedUrl.substring(0, 100) + '...');
    }

    console.log('Multipart: Generated', presignedUrls.length, 'presigned URLs');

    return NextResponse.json({
      success: true,
      uploadId: UploadId,
      presignedUrls,
      key: outputFileName,
      maxParts
    });

  } catch (error) {
    console.error('Multipart: Error initiating upload:', error);
    return NextResponse.json({ error: 'Failed to initiate multipart upload' }, { status: 500 });
  }
} 