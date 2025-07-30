import { NextRequest, NextResponse } from 'next/server';
import { S3Client, CompleteMultipartUploadCommand, AbortMultipartUploadCommand } from '@aws-sdk/client-s3';

const BUCKET = process.env.AWS_S3_BUCKET!;
const REGION = process.env.AWS_REGION!;
const s3 = new S3Client({ region: REGION });

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
    console.log('Multipart: Received completion request:', body);
    
    const { uploadId, key, parts } = body;
    
    if (!uploadId || !key || !parts || !Array.isArray(parts)) {
      console.error('Multipart: Missing required parameters:', { uploadId: !!uploadId, key: !!key, parts: !!parts, isArray: Array.isArray(parts) });
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    console.log('Multipart: Completing upload:', { uploadId, key, partsCount: parts.length, parts });

    // Validate parts array
    const validParts = parts.filter(part => 
      part.PartNumber && part.ETag && 
      typeof part.PartNumber === 'number' && 
      typeof part.ETag === 'string'
    );

    if (validParts.length === 0) {
      // No valid parts, abort the upload
      console.log('Multipart: No valid parts, aborting upload');
      await s3.send(new AbortMultipartUploadCommand({
        Bucket: BUCKET,
        Key: key,
        UploadId: uploadId
      }));
      return NextResponse.json({ error: 'No valid parts to complete' }, { status: 400 });
    }

    // Sort parts by part number
    validParts.sort((a, b) => a.PartNumber - b.PartNumber);

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
    
    console.log('Multipart: Successfully completed upload:', result.Location);

    return NextResponse.json({
      success: true,
      location: result.Location,
      key: key,
      partsCount: validParts.length
    });

  } catch (error: any) {
    console.error('Multipart: Error completing upload:', error);
    console.error('Multipart: Error details:', {
      name: error.name,
      message: error.message,
      code: error.$metadata?.httpStatusCode,
      requestId: error.$metadata?.requestId,
      cfId: error.$metadata?.cfId
    });
    
    // Try to abort the upload if completion failed
    try {
      const { uploadId, key } = body;
      if (uploadId && key) {
        await s3.send(new AbortMultipartUploadCommand({
          Bucket: BUCKET,
          Key: key,
          UploadId: uploadId
        }));
        console.log('Multipart: Aborted upload due to completion failure');
      }
    } catch (abortError) {
      console.error('Multipart: Failed to abort upload:', abortError);
    }
    
    return NextResponse.json({ 
      error: 'Failed to complete multipart upload',
      details: error.message,
      code: error.$metadata?.httpStatusCode
    }, { status: 500 });
  }
} 