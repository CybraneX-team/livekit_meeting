import { NextRequest, NextResponse } from 'next/server';
import { S3Client, ListBucketsCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';

const BUCKET = process.env.AWS_S3_BUCKET!;
const REGION = process.env.AWS_REGION!;

export async function GET(req: NextRequest) {
  try {
    console.log('Test AWS: Checking credentials and bucket access');
    console.log('Test AWS: Environment variables:', {
      hasAccessKey: !!process.env.AWS_ACCESS_KEY_ID,
      hasSecretKey: !!process.env.AWS_SECRET_ACCESS_KEY,
      region: REGION,
      bucket: BUCKET
    });

    const s3 = new S3Client({ region: REGION });

    // Test 1: List buckets (basic credential test)
    console.log('Test AWS: Testing basic credentials...');
    const listBucketsCommand = new ListBucketsCommand({});
    const bucketsResult = await s3.send(listBucketsCommand);
    console.log('Test AWS: Successfully listed buckets:', bucketsResult.Buckets?.map(b => b.Name));

    // Test 2: List objects in your bucket
    console.log('Test AWS: Testing bucket access...');
    const listObjectsCommand = new ListObjectsV2Command({ Bucket: BUCKET });
    const objectsResult = await s3.send(listObjectsCommand);
    console.log('Test AWS: Successfully listed objects in bucket:', {
      bucket: BUCKET,
      objectCount: objectsResult.Contents?.length || 0
    });

    return NextResponse.json({
      success: true,
      message: 'AWS credentials and bucket access verified',
      data: {
        buckets: bucketsResult.Buckets?.map(b => b.Name),
        bucketAccess: true,
        bucketName: BUCKET,
        objectCount: objectsResult.Contents?.length || 0
      }
    });

  } catch (error: any) {
    console.error('Test AWS: Error:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message,
      details: {
        name: error.name,
        code: error.$metadata?.httpStatusCode,
        requestId: error.$metadata?.requestId
      }
    }, { status: 500 });
  }
} 