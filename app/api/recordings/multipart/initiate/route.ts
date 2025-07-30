import { NextRequest, NextResponse } from 'next/server';
import { S3Client, CreateMultipartUploadCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { UploadPartCommand } from '@aws-sdk/client-s3';

const BUCKET = process.env.AWS_S3_BUCKET!;
const REGION = process.env.AWS_REGION!;
const s3 = new S3Client({ region: REGION });

function getOutputFileName(userId: string, roomName: string, timestamp: string, recordingId: string, recordingName?: string, quality?: string) {
  let base = `${userId}_${roomName}_${timestamp}_${recordingId}`;
  
  // Add quality to filename if specified
  if (quality && quality !== 'medium') {
    base += `_${quality}`;
  }
  
  // Add recording name if provided
  if (recordingName) {
    const safeName = recordingName.replace(/[^a-zA-Z0-9-_]/g, '_');
    base += `__${safeName}`;
  }
  
  return `${base}.webm`;
}

function validateRecordingRequest(data: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!data.userId || typeof data.userId !== 'string') {
    errors.push('userId is required and must be a string');
  }
  
  if (!data.roomName || typeof data.roomName !== 'string') {
    errors.push('roomName is required and must be a string');
  }
  
  if (!data.timestamp || typeof data.timestamp !== 'string') {
    errors.push('timestamp is required and must be a string');
  }
  
  if (!data.recordingId || typeof data.recordingId !== 'string') {
    errors.push('recordingId is required and must be a string');
  }
  
  if (data.recordingName && typeof data.recordingName !== 'string') {
    errors.push('recordingName must be a string if provided');
  }
  
  if (data.estimatedParts && (typeof data.estimatedParts !== 'number' || data.estimatedParts < 1 || data.estimatedParts > 100)) {
    errors.push('estimatedParts must be a number between 1 and 100');
  }
  
  if (data.quality && !['low', 'medium', 'high'].includes(data.quality)) {
    errors.push('quality must be one of: low, medium, high');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    
    // Validate request data
    const validation = validateRecordingRequest(data);
    if (!validation.isValid) {
      return NextResponse.json({ 
        error: 'Invalid request data', 
        details: validation.errors 
      }, { status: 400 });
    }
    
    const { 
      userId, 
      roomName, 
      timestamp, 
      recordingId, 
      recordingName, 
      estimatedParts = 20,
      quality = 'medium'
    } = data;

    const outputFileName = getOutputFileName(userId, roomName, timestamp, recordingId, recordingName, quality);
    
    console.log('Multipart: Initiating upload for:', {
      outputFileName,
      userId,
      roomName,
      recordingId,
      quality,
      estimatedParts
    });

    // 1. Initiate multipart upload with metadata in filename
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
        quality,
        uploadType: 'multipart'
      }
    });

    const { UploadId } = await s3.send(createMultipartCommand);
    
    if (!UploadId) {
      throw new Error('Failed to get upload ID from S3');
    }

    console.log('Multipart: Created upload ID:', UploadId);

    // 2. Generate presigned URLs for all parts with better error handling
    const presignedUrls: string[] = [];
    const maxParts = Math.min(Math.max(estimatedParts, 1), 100); // Ensure between 1-100

    console.log('Multipart: Generating presigned URLs for', maxParts, 'parts');

    for (let partNumber = 1; partNumber <= maxParts; partNumber++) {
      try {
        const uploadPartCommand = new UploadPartCommand({
          Bucket: BUCKET,
          Key: outputFileName,
          UploadId,
          PartNumber: partNumber,
        });

        const presignedUrl = await getSignedUrl(s3, uploadPartCommand, { 
          expiresIn: 3600 // 1 hour expiry
        });
        
        presignedUrls.push(presignedUrl);
        
        console.log('Multipart: Generated presigned URL for part', partNumber);
      } catch (error) {
        console.error('Multipart: Error generating presigned URL for part', partNumber, error);
        throw new Error(`Failed to generate presigned URL for part ${partNumber}`);
      }
    }

    console.log('Multipart: Successfully generated', presignedUrls.length, 'presigned URLs');

    // 3. Return simplified response
    return NextResponse.json({
      success: true,
      uploadId: UploadId,
      presignedUrls,
      key: outputFileName,
      maxParts,
      uploadConfig: {
        chunkSize: 180000, // 3 minutes for proper WebM chunks
        maxRetries: 3,
        retryDelay: 1000, // 1 second
        quality,
        format: 'webm'
      }
    });

  } catch (error: any) {
    console.error('Multipart: Error initiating upload:', error);
    
    // Enhanced error response
    return NextResponse.json({ 
      error: 'Failed to initiate multipart upload',
      details: error.message,
      code: error.$metadata?.httpStatusCode || 500
    }, { status: 500 });
  }
} 