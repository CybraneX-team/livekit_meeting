import { NextRequest, NextResponse } from 'next/server';
import { S3Client, CompleteMultipartUploadCommand, AbortMultipartUploadCommand } from '@aws-sdk/client-s3';

const BUCKET = process.env.AWS_S3_BUCKET!;
const REGION = process.env.AWS_REGION!;
const s3 = new S3Client({ region: REGION });

interface CompletionRequest {
  uploadId: string;
  key: string;
  parts: Array<{ PartNumber: number; ETag: string }>;
  recordingMetadata?: {
    recordingName?: string;
    finalDuration?: number;
    totalSize?: number;
    quality?: string;
  };
}

function validateCompletionRequest(data: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!data.uploadId || typeof data.uploadId !== 'string') {
    errors.push('uploadId is required and must be a string');
  }
  
  if (!data.key || typeof data.key !== 'string') {
    errors.push('key is required and must be a string');
  }
  
  if (!data.parts || !Array.isArray(data.parts)) {
    errors.push('parts is required and must be an array');
  } else {
    // Validate each part
    data.parts.forEach((part: any, index: number) => {
      if (!part.PartNumber || typeof part.PartNumber !== 'number' || part.PartNumber < 1) {
        errors.push(`parts[${index}].PartNumber must be a positive number`);
      }
      if (!part.ETag || typeof part.ETag !== 'string') {
        errors.push(`parts[${index}].ETag must be a string`);
      }
    });
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

export async function POST(req: NextRequest) {
  let body: CompletionRequest | null = null;
  
  try {
    body = await req.json();
    console.log('Multipart: Received completion request:', {
      uploadId: body?.uploadId,
      key: body?.key,
      partsCount: body?.parts?.length || 0,
      hasMetadata: !!body?.recordingMetadata
    });
    
    // Validate request
    const validation = validateCompletionRequest(body);
    if (!validation.isValid) {
      return NextResponse.json({ 
        error: 'Invalid completion request', 
        details: validation.errors 
      }, { status: 400 });
    }
    
    const { uploadId, key, parts, recordingMetadata } = body!;

    console.log('Multipart: Completing upload:', { 
      uploadId, 
      key, 
      partsCount: parts.length,
      recordingMetadata 
    });

    // Validate and clean parts array
    const validParts = parts.filter((part: any) => 
      part.PartNumber && part.ETag && 
      typeof part.PartNumber === 'number' && 
      typeof part.ETag === 'string' &&
      part.PartNumber > 0
    );

    if (validParts.length === 0) {
      console.log('Multipart: No valid parts, aborting upload');
      await s3.send(new AbortMultipartUploadCommand({
        Bucket: BUCKET,
        Key: key,
        UploadId: uploadId
      }));
      return NextResponse.json({ 
        error: 'No valid parts to complete',
        details: 'All parts were invalid or missing required fields'
      }, { status: 400 });
    }

    // Sort parts by part number to ensure ascending order
    validParts.sort((a: any, b: any) => a.PartNumber - b.PartNumber);

    // Check for missing part numbers (should be sequential)
    const expectedPartNumbers = Array.from({ length: validParts.length }, (_, i) => i + 1);
    const actualPartNumbers = validParts.map((p: any) => p.PartNumber);
    const missingParts = expectedPartNumbers.filter(num => !actualPartNumbers.includes(num));
    
    if (missingParts.length > 0) {
      console.warn('Multipart: Missing part numbers:', missingParts);
      // Continue anyway, but log the warning
    }

    console.log('Multipart: Valid parts to complete:', validParts.length);

    // Complete multipart upload
    const completeCommand = new CompleteMultipartUploadCommand({
      Bucket: BUCKET,
      Key: key,
      UploadId: uploadId,
      MultipartUpload: {
        Parts: validParts
      }
    });

    const result = await s3.send(completeCommand);
    
    console.log('Multipart: Successfully completed upload:', {
      location: result.Location,
      key: key,
      partsCount: validParts.length,
      etag: result.ETag
    });

    // Calculate total size from parts (approximate)
    const totalSize = validParts.length * 5 * 1024 * 1024; // Estimate 5MB per part

    return NextResponse.json({
      success: true,
      location: result.Location,
      key: key,
      etag: result.ETag,
      partsCount: validParts.length,
      totalSize,
      recordingMetadata,
      completedAt: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Multipart: Error completing upload:', error);
    console.error('Multipart: Error details:', {
      name: error.name,
      message: error.message,
      code: error.$metadata?.httpStatusCode || 500,
      requestId: error.$metadata?.requestId
    });
    
    // Try to abort the upload if completion failed
    try {
      if (body?.uploadId && body?.key) {
        await s3.send(new AbortMultipartUploadCommand({
          Bucket: BUCKET,
          Key: body.key,
          UploadId: body.uploadId
        }));
        console.log('Multipart: Aborted upload due to completion failure');
      }
    } catch (abortError) {
      console.error('Multipart: Failed to abort upload:', abortError);
    }
    
    return NextResponse.json({ 
      error: 'Failed to complete multipart upload',
      details: error.message,
      code: error.$metadata?.httpStatusCode || 500,
      requestId: error.$metadata?.requestId
    }, { status: 500 });
  }
} 