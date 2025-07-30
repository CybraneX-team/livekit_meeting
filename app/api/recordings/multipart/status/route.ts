import { NextRequest, NextResponse } from 'next/server';
import { S3Client, ListPartsCommand, HeadObjectCommand } from '@aws-sdk/client-s3';

const BUCKET = process.env.AWS_S3_BUCKET!;
const REGION = process.env.AWS_REGION!;
const s3 = new S3Client({ region: REGION });

interface UploadStatus {
  uploadId: string;
  key: string;
  status: 'uploading' | 'completed' | 'failed' | 'aborted';
  partsUploaded: number;
  totalParts: number;
  progress: number; // 0-100
  lastUpdated: string;
  estimatedTimeRemaining?: number; // in seconds
  totalSize?: number; // in bytes
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const uploadId = url.searchParams.get('uploadId');
    const key = url.searchParams.get('key');
    
    if (!uploadId || !key) {
      return NextResponse.json({ 
        error: 'Missing required parameters',
        details: 'uploadId and key are required'
      }, { status: 400 });
    }

    console.log('Status: Checking upload status for:', { uploadId, key });

    try {
      // Try to get upload parts to check if upload is still in progress
      const listPartsResponse = await s3.send(new ListPartsCommand({
        Bucket: BUCKET,
        Key: key,
        UploadId: uploadId
      }));

      const partsUploaded = listPartsResponse.Parts?.length || 0;
      const totalSize = listPartsResponse.Parts?.reduce((sum, part) => sum + (part.Size || 0), 0) || 0;

      console.log('Status: Upload in progress:', { partsUploaded, totalSize });

      return NextResponse.json({
        success: true,
        status: 'uploading',
        uploadId,
        key,
        partsUploaded,
        totalParts: partsUploaded, // We don't know total until completion
        progress: Math.min((partsUploaded / 20) * 100, 95), // Estimate based on 20 parts
        lastUpdated: new Date().toISOString(),
        totalSize,
        estimatedTimeRemaining: Math.max(0, (20 - partsUploaded) * 30) // 30 seconds per part
      });

    } catch (listError: any) {
      // If ListParts fails, the upload might be completed or aborted
      console.log('Status: ListParts failed, checking if upload is completed:', listError.message);

      try {
        // Try to get object metadata to check if upload is completed
        const headResponse = await s3.send(new HeadObjectCommand({
          Bucket: BUCKET,
          Key: key
        }));

        console.log('Status: Upload completed successfully');

        return NextResponse.json({
          success: true,
          status: 'completed',
          uploadId,
          key,
          partsUploaded: 0, // Not applicable for completed uploads
          totalParts: 0,
          progress: 100,
          lastUpdated: new Date().toISOString(),
          totalSize: headResponse.ContentLength,
          etag: headResponse.ETag,
          completedAt: headResponse.LastModified?.toISOString()
        });

      } catch (headError: any) {
        // If HeadObject also fails, the upload might be aborted or failed
        console.log('Status: Upload appears to be aborted or failed');

        return NextResponse.json({
          success: true,
          status: 'aborted',
          uploadId,
          key,
          partsUploaded: 0,
          totalParts: 0,
          progress: 0,
          lastUpdated: new Date().toISOString(),
          error: 'Upload was aborted or failed'
        });
      }
    }

  } catch (error: any) {
    console.error('Status: Error checking upload status:', error);
    
    return NextResponse.json({ 
      error: 'Failed to check upload status',
      details: error.message,
      code: error.$metadata?.httpStatusCode || 500
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { uploadId, key, status, partsUploaded, totalParts, totalSize } = await req.json();
    
    if (!uploadId || !key || !status) {
      return NextResponse.json({ 
        error: 'Missing required parameters',
        details: 'uploadId, key, and status are required'
      }, { status: 400 });
    }

    console.log('Status: Updating upload status:', { 
      uploadId, 
      key, 
      status, 
      partsUploaded, 
      totalParts,
      totalSize 
    });

    // In a real implementation, you might store this in a database
    // For now, we'll just log the status update
    const statusUpdate: UploadStatus = {
      uploadId,
      key,
      status: status as 'uploading' | 'completed' | 'failed' | 'aborted',
      partsUploaded: partsUploaded || 0,
      totalParts: totalParts || 0,
      progress: totalParts ? Math.min((partsUploaded / totalParts) * 100, 100) : 0,
      lastUpdated: new Date().toISOString(),
      totalSize: totalSize || 0
    };

    console.log('Status: Status update logged:', statusUpdate);

    return NextResponse.json({
      success: true,
      message: 'Status updated successfully',
      status: statusUpdate
    });

  } catch (error: any) {
    console.error('Status: Error updating upload status:', error);
    
    return NextResponse.json({ 
      error: 'Failed to update upload status',
      details: error.message
    }, { status: 500 });
  }
} 