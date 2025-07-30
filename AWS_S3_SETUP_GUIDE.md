# AWS S3 Setup Guide for Presigned URLs

## **🔧 Required AWS S3 Configuration**

### **1. S3 Bucket Policy**
Your S3 bucket needs a policy that allows the presigned URL operations. Add this bucket policy:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "AllowPresignedUrlUploads",
            "Effect": "Allow",
            "Principal": "*",
            "Action": [
                "s3:PutObject",
                "s3:GetObject",
                "s3:AbortMultipartUpload",
                "s3:ListMultipartUploadParts"
            ],
            "Resource": "arn:aws:s3:::YOUR-BUCKET-NAME/*",
            "Condition": {
                "StringEquals": {
                    "aws:PrincipalArn": "arn:aws:iam::YOUR-ACCOUNT-ID:user/YOUR-IAM-USER"
                }
            }
        }
    ]
}
```

### **2. IAM User Permissions**
Your IAM user needs these permissions:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:PutObject",
                "s3:GetObject",
                "s3:DeleteObject",
                "s3:ListBucket",
                "s3:CreateMultipartUpload",
                "s3:UploadPart",
                "s3:CompleteMultipartUpload",
                "s3:AbortMultipartUpload",
                "s3:ListMultipartUploadParts"
            ],
            "Resource": [
                "arn:aws:s3:::YOUR-BUCKET-NAME",
                "arn:aws:s3:::YOUR-BUCKET-NAME/*"
            ]
        }
    ]
}
```

### **3. CORS Configuration**
Add this CORS configuration to your S3 bucket:

```json
[
    {
        "AllowedHeaders": [
            "*"
        ],
        "AllowedMethods": [
            "GET",
            "PUT",
            "POST",
            "DELETE",
            "HEAD"
        ],
        "AllowedOrigins": [
            "*"
        ],
        "ExposeHeaders": [
            "ETag"
        ],
        "MaxAgeSeconds": 3000
    }
]
```

### **4. Environment Variables**
Make sure these are set correctly:

```env
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=your_region
AWS_S3_BUCKET=your_bucket_name
```

## **🚨 Common Issues & Solutions**

### **Issue 1: 403 Forbidden**
**Cause:** Missing permissions or incorrect bucket policy
**Solution:** Follow steps 1-3 above

### **Issue 2: CORS Error**
**Cause:** Missing CORS configuration
**Solution:** Add CORS policy to S3 bucket

### **Issue 3: Invalid Signature**
**Cause:** Wrong region or credentials
**Solution:** Check environment variables

### **Issue 4: Bucket Not Found**
**Cause:** Wrong bucket name
**Solution:** Verify AWS_S3_BUCKET environment variable

## **🔍 Debugging Steps**

1. **Check AWS credentials** in your environment
2. **Verify bucket name** is correct
3. **Test IAM permissions** with AWS CLI
4. **Check CORS configuration** in S3 console
5. **Verify bucket policy** allows your IAM user

## **📝 Quick Test**

Test your setup with AWS CLI:

```bash
aws s3 ls s3://your-bucket-name
```

If this works, your credentials are correct. 