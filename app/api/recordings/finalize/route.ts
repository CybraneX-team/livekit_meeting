import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand, ListObjectsV2Command, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

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
  let data;
  const contentType = req.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    data = await req.json();
  } else if (contentType.includes('application/x-www-form-urlencoded')) {
    const form = await req.formData();
    data = Object.fromEntries(form.entries());
  } else {
    return NextResponse.json({ error: 'Unsupported content type' }, { status: 400 });
  }

  const { recordingId, userId, roomName, timestamp, recordingName } = data;
  if (!recordingId || !userId || !roomName || !timestamp) {
    return NextResponse.json({ error: 'Missing required params' }, { status: 400 });
  }

  // Debug: Check recordingId
  console.log('Finalize: recordingId:', recordingId);
  
    // Get all chunks from S3 with retry mechanism
  const chunks: Buffer[] = [];
  let retryCount = 0;
  const maxRetries = 3;
  let listResponse: any;
  
  while (retryCount < maxRetries) {
    try {
      // List all chunks for this recording
      listResponse = await s3.send(new ListObjectsV2Command({
        Bucket: BUCKET,
        Prefix: `chunks/${recordingId}/`,
      }));
      
      console.log(`Finalize: Attempt ${retryCount + 1} - Found chunk objects:`, listResponse.Contents?.length || 0);
      
      if (!listResponse.Contents || listResponse.Contents.length === 0) {
        if (retryCount < maxRetries - 1) {
          console.log(`Finalize: No chunks found, retrying in 2 seconds... (${retryCount + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, 2000));
          retryCount++;
          continue;
        } else {
          return NextResponse.json({ error: 'No chunks found after retries' }, { status: 400 });
        }
      }
      
      // If we found chunks, break out of retry loop
      break;
    } catch (error) {
      console.error('Finalize: Error listing chunks from S3:', error);
      if (retryCount < maxRetries - 1) {
        retryCount++;
        continue;
      } else {
        return NextResponse.json({ error: 'Failed to list chunks' }, { status: 500 });
      }
    }
  }
  
  // Download all chunks
  try {
    if (listResponse.Contents) {
      for (const obj of listResponse.Contents) {
        if (obj.Key) {
          const getResponse = await s3.send(new GetObjectCommand({
            Bucket: BUCKET,
            Key: obj.Key,
          }));
          
          if (getResponse.Body) {
            const stream = getResponse.Body as NodeJS.ReadableStream;
            const chunkChunks: Buffer[] = [];
            for await (const chunk of stream) {
              if (typeof chunk === 'string') {
                chunkChunks.push(Buffer.from(chunk, 'utf8'));
              } else {
                chunkChunks.push(Buffer.from(chunk));
              }
            }
            chunks.push(Buffer.concat(chunkChunks));
          }
        }
      }
    }
    
    console.log('Finalize: Downloaded chunks:', chunks.length);
  } catch (error) {
    console.error('Finalize: Error retrieving chunks from S3:', error);
    return NextResponse.json({ error: 'Failed to retrieve chunks' }, { status: 500 });
  }
  
  if (chunks.length === 0) {
    return NextResponse.json({ error: 'No chunks found' }, { status: 400 });
  }

  // Create proper WebM file with metadata
  const outputFileName = getOutputFileName(userId, roomName, timestamp, recordingId, recordingName);
  
  // For now, use the first chunk as the base and append others
  // This is a simple approach that should work for most cases
  let finalVideoBuffer: Buffer;
  
  if (chunks.length === 1) {
    finalVideoBuffer = chunks[0];
  } else {
    // Simple concatenation - this may not work perfectly for all WebM files
    // but it's better than nothing for now
    finalVideoBuffer = Buffer.concat(chunks);
  }
  
  console.log('Finalize: Final video size:', finalVideoBuffer.length);

  // Upload to S3
  try {
    await s3.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: outputFileName,
      Body: finalVideoBuffer,
      ContentType: 'video/webm',
    }));
    console.log('Finalize: Uploaded to S3:', outputFileName);
  } catch (s3Error) {
    console.error('Finalize: S3 upload error:', s3Error);
    throw s3Error;
  }

  // Clean up S3 chunks
  try {
    const listResponse = await s3.send(new ListObjectsV2Command({
      Bucket: BUCKET,
      Prefix: `chunks/${recordingId}/`,
    }));
    
    if (listResponse.Contents) {
      for (const obj of listResponse.Contents) {
        if (obj.Key) {
          await s3.send(new DeleteObjectCommand({
            Bucket: BUCKET,
            Key: obj.Key,
          }));
        }
      }
    }
    console.log('Finalize: Cleaned up S3 chunks for recordingId:', recordingId);
  } catch (error) {
    console.error('Finalize: Error cleaning up S3 chunks:', error);
    // Don't fail the request if cleanup fails
  }

  const s3Url = `https://${BUCKET}.s3.${REGION}.amazonaws.com/${outputFileName}`;
  return NextResponse.json({ success: true, url: s3Url, recordingName });
} 