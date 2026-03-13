import { IAMClient } from '@aws-sdk/client-iam';
import { S3Client } from '@aws-sdk/client-s3';
import { S3ControlClient } from '@aws-sdk/client-s3-control';
import { EC2Client } from '@aws-sdk/client-ec2';
import { CloudTrailClient } from '@aws-sdk/client-cloudtrail';
import { KMSClient } from '@aws-sdk/client-kms';
import { STSClient } from '@aws-sdk/client-sts';

const credentials = {
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
};

const region = process.env.AWS_REGION || 'ap-south-1';

export function getIAMClient() {
  return new IAMClient({ credentials, region });
}

export function getS3Client() {
  return new S3Client({ credentials, region });
}

export function getS3ControlClient() {
  return new S3ControlClient({ credentials, region });
}

export function getEC2Client() {
  return new EC2Client({ credentials, region });
}

export function getCloudTrailClient() {
  return new CloudTrailClient({ credentials, region });
}

export function getKMSClient() {
  return new KMSClient({ credentials, region });
}

export function getSTSClient() {
  return new STSClient({ credentials, region });
}
