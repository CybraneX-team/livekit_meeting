# 🧪 Testing Guide for Unified Recording System

## **📋 Prerequisites**

### **1. Environment Setup**
Make sure you have these environment variables set in your `.env.local` file:

```env
# AWS S3 Configuration
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=your_region
AWS_S3_BUCKET=your_bucket_name

# LiveKit Configuration
LIVEKIT_URL=your_livekit_url
LIVEKIT_API_KEY=your_api_key
LIVEKIT_API_SECRET=your_api_secret
```

### **2. AWS S3 Setup**
Follow the `AWS_S3_SETUP_GUIDE.md` to configure your S3 bucket with proper permissions and CORS settings.

### **3. Start Development Server**
```bash
cd livekit_meeting
npm run dev
```

## **🧪 Testing Checklist**

### **Phase 1: Basic Recording Functionality**

#### **✅ Test 1: Recording Button Rendering**
- [ ] Navigate to a meeting room
- [ ] Verify RecordButton component renders correctly
- [ ] Check button shows "Start Recording" initially
- [ ] Verify button is not disabled

#### **✅ Test 2: Recording Start**
- [ ] Click "Start Recording" button
- [ ] Verify screen sharing permission dialog appears
- [ ] Grant screen sharing permissions
- [ ] Check button changes to "Stop Recording"
- [ ] Verify recording indicator appears (if implemented)
- [ ] Check browser console for multipart upload initialization logs

#### **✅ Test 3: Recording Progress**
- [ ] During recording, check for progress indicators
- [ ] Verify upload progress percentage displays
- [ ] Check estimated time remaining updates
- [ ] Monitor browser console for chunk upload logs

#### **✅ Test 4: Recording Stop**
- [ ] Click "Stop Recording" button
- [ ] Verify recording name prompt appears
- [ ] Enter a recording name or use default
- [ ] Check button returns to "Start Recording"
- [ ] Verify upload completion logs in console

### **Phase 2: Error Handling**

#### **✅ Test 5: Network Error Simulation**
- [ ] Start recording
- [ ] Disconnect internet temporarily
- [ ] Check error message appears
- [ ] Reconnect internet
- [ ] Verify retry logic works
- [ ] Check recording continues or stops gracefully

#### **✅ Test 6: Permission Denied**
- [ ] Try to start recording
- [ ] Deny screen sharing permissions
- [ ] Verify appropriate error message
- [ ] Check button returns to normal state

#### **✅ Test 7: AWS S3 Errors**
- [ ] Temporarily modify AWS credentials to be invalid
- [ ] Try to start recording
- [ ] Check error handling and user feedback
- [ ] Restore correct credentials

### **Phase 3: API Testing**

#### **✅ Test 8: Multipart Initiate API**
```bash
curl -X POST http://localhost:3000/api/recordings/multipart/initiate \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user",
    "roomName": "test-room",
    "timestamp": "1703123456789",
    "recordingId": "test-recording-id",
    "recordingName": "Test Recording",
    "estimatedParts": 20,
    "quality": "medium"
  }'
```
- [ ] Verify response contains uploadId, presignedUrls, and config
- [ ] Check all required fields are present

#### **✅ Test 9: Multipart Complete API**
```bash
curl -X POST http://localhost:3000/api/recordings/multipart/complete \
  -H "Content-Type: application/json" \
  -d '{
    "uploadId": "your-upload-id",
    "key": "your-file-key",
    "parts": [
      {"PartNumber": 1, "ETag": "your-etag"}
    ],
    "recordingMetadata": {
      "recordingName": "Test Recording",
      "finalDuration": 300,
      "totalSize": 5000000,
      "quality": "medium"
    }
  }'
```
- [ ] Verify successful completion response
- [ ] Check file appears in S3 bucket

#### **✅ Test 10: Status API**
```bash
curl "http://localhost:3000/api/recordings/multipart/status?uploadId=your-upload-id&key=your-file-key"
```
- [ ] Verify status response structure
- [ ] Check progress and time remaining fields

#### **✅ Test 11: List API**
```bash
curl "http://localhost:3000/api/recordings/list?limit=10&offset=0&sortBy=timestamp&sortOrder=desc"
```
- [ ] Verify recordings list response
- [ ] Check pagination and sorting work
- [ ] Test filtering by userId and roomName

### **Phase 4: Integration Testing**

#### **✅ Test 12: End-to-End Recording**
- [ ] Start a meeting with multiple participants
- [ ] Start recording from one participant
- [ ] Verify all participants see recording indicator
- [ ] Perform various activities during recording
- [ ] Stop recording
- [ ] Verify recording appears in list
- [ ] Test downloading the recording

#### **✅ Test 13: Multiple Recordings**
- [ ] Create multiple recordings in same room
- [ ] Verify unique recording IDs
- [ ] Check recordings list shows all recordings
- [ ] Test recording naming and metadata

#### **✅ Test 14: Browser Compatibility**
- [ ] Test in Chrome (recommended)
- [ ] Test in Firefox
- [ ] Test in Safari
- [ ] Verify screen sharing permissions work
- [ ] Check MediaRecorder API support

### **Phase 5: Performance Testing**

#### **✅ Test 15: Long Recording**
- [ ] Start recording for 10+ minutes
- [ ] Monitor memory usage
- [ ] Check upload progress remains stable
- [ ] Verify no memory leaks

#### **✅ Test 16: Large File Upload**
- [ ] Record high-quality video
- [ ] Monitor upload speed
- [ ] Check chunk upload reliability
- [ ] Verify completion with large files

## **🔍 Debugging Tools**

### **Browser Developer Tools**
1. **Console Logs**: Monitor for `[DEBUG]` messages
2. **Network Tab**: Check API calls and upload progress
3. **Performance Tab**: Monitor memory usage during recording

### **AWS S3 Console**
1. Check bucket for uploaded files
2. Monitor multipart uploads
3. Verify file metadata

### **Common Debug Messages**
```
[DEBUG] Multipart upload initialized: {...}
[DEBUG] Uploading part X, attempt Y, size: Z bytes
[DEBUG] Successfully uploaded part: {...}
[DEBUG] Multipart upload completed: {...}
[DEBUG] Broadcasted recording status: start/stop
```

## **🚨 Troubleshooting**

### **Issue: Recording Button Not Working**
- Check browser console for errors
- Verify LiveKit connection is active
- Check screen sharing permissions

### **Issue: Upload Fails**
- Verify AWS S3 credentials
- Check CORS configuration
- Monitor network connectivity

### **Issue: Progress Not Updating**
- Check browser console for chunk upload logs
- Verify presigned URLs are valid
- Check retry logic is working

### **Issue: Recording Not Appearing in List**
- Check S3 bucket for uploaded files
- Verify file naming convention
- Check list API response

## **📊 Success Criteria**

### **✅ All Tests Pass**
- [ ] Recording starts and stops successfully
- [ ] Progress tracking works accurately
- [ ] Error handling provides clear feedback
- [ ] Uploads complete reliably
- [ ] Recordings appear in list with metadata

### **✅ Performance Metrics**
- [ ] Recording starts within 3 seconds
- [ ] Upload progress updates every 30 seconds
- [ ] No memory leaks during long recordings
- [ ] Error recovery within 10 seconds

### **✅ User Experience**
- [ ] Clear visual feedback during recording
- [ ] Intuitive error messages
- [ ] Smooth progress indicators
- [ ] Responsive UI during uploads

## **🎯 Next Steps After Testing**

1. **Fix any issues** found during testing
2. **Optimize performance** based on test results
3. **Add additional features** (Phase 3 & 4)
4. **Deploy to production** environment
5. **Monitor real-world usage**

---

**Need Help?** Check the browser console for detailed debug logs and refer to the AWS S3 setup guide for configuration issues. 