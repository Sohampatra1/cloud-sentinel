import {
  ListBucketsCommand,
  GetBucketEncryptionCommand,
  GetBucketVersioningCommand,
  GetBucketLoggingCommand,
  GetBucketPolicyStatusCommand,
  GetBucketPolicyCommand,
  GetPublicAccessBlockCommand,
} from '@aws-sdk/client-s3';
import { GetPublicAccessBlockCommand as GetAccountPublicAccessBlockCommand } from '@aws-sdk/client-s3-control';
import { GetCallerIdentityCommand } from '@aws-sdk/client-sts';
import { getS3Client, getS3ControlClient, getSTSClient } from '../aws-clients';
import { BaseScanner } from './base';

export class S3Scanner extends BaseScanner {
  constructor() {
    super('S3');
    this.s3 = getS3Client();
    this.s3Control = getS3ControlClient();
    this.sts = getSTSClient();
  }

  async scan() {
    await this.checkAccountPublicAccessBlock();
    await this.checkBuckets();
    return this.findings;
  }

  async checkAccountPublicAccessBlock() {
    try {
      const identity = await this.sts.send(new GetCallerIdentityCommand({}));
      const accountId = identity.Account;
      try {
        const res = await this.s3Control.send(new GetAccountPublicAccessBlockCommand({ AccountId: accountId }));
        const config = res.PublicAccessBlockConfiguration;
        if (!config.BlockPublicAcls || !config.BlockPublicPolicy || !config.IgnorePublicAcls || !config.RestrictPublicBuckets) {
          this._finding({
            title: 'Account-level S3 public access block incomplete',
            description: 'Not all account-level S3 public access block settings are enabled. This means individual buckets can still be made public.',
            severity: 'HIGH',
            resource: `arn:aws:s3-control::${accountId}`,
            cisBenchmark: '2.1.4',
          });
        }
      } catch (e) {
        if (e.name === 'NoSuchPublicAccessBlockConfiguration') {
          this._finding({
            title: 'Account-level S3 public access block not configured',
            description: 'No account-level S3 public access block exists. Any bucket can be made publicly accessible.',
            severity: 'HIGH',
            resource: `arn:aws:s3-control::${accountId}`,
            cisBenchmark: '2.1.4',
          });
        } else {
          console.error('S3 checkAccountPublicAccessBlock error:', e.message);
        }
      }
    } catch (e) {
      console.error('S3 getCallerIdentity error:', e.message);
    }
  }

  async checkBuckets() {
    try {
      const res = await this.s3.send(new ListBucketsCommand({}));
      const buckets = (res.Buckets || []).slice(0, 50);

      for (const bucket of buckets) {
        const name = bucket.Name;
        const arn = `arn:aws:s3:::${name}`;

        await Promise.allSettled([
          this.checkBucketPublicAccess(name, arn),
          this.checkBucketEncryption(name, arn),
          this.checkBucketVersioning(name, arn),
          this.checkBucketLogging(name, arn),
          this.checkBucketPolicyPublic(name, arn),
          this.checkSSLEnforcement(name, arn),
        ]);
      }
    } catch (e) {
      console.error('S3 listBuckets error:', e.message);
    }
  }

  async checkBucketPublicAccess(name, arn) {
    try {
      const res = await this.s3.send(new GetPublicAccessBlockCommand({ Bucket: name }));
      const config = res.PublicAccessBlockConfiguration;
      if (!config.BlockPublicAcls || !config.BlockPublicPolicy || !config.IgnorePublicAcls || !config.RestrictPublicBuckets) {
        this._finding({
          title: `S3 bucket "${name}" public access block incomplete`,
          description: `Bucket ${name} does not have all public access block settings enabled. This bucket could potentially be made public.`,
          severity: 'HIGH',
          resource: arn,
          cisBenchmark: '2.1.5',
        });
      }
    } catch (e) {
      if (e.name === 'NoSuchPublicAccessBlockConfiguration') {
        this._finding({
          title: `S3 bucket "${name}" has no public access block`,
          description: `Bucket ${name} has no public access block configuration. It can be made publicly accessible.`,
          severity: 'HIGH',
          resource: arn,
          cisBenchmark: '2.1.5',
        });
      }
    }
  }

  async checkBucketEncryption(name, arn) {
    try {
      await this.s3.send(new GetBucketEncryptionCommand({ Bucket: name }));
    } catch (e) {
      if (e.name === 'ServerSideEncryptionConfigurationNotFoundError') {
        this._finding({
          title: `S3 bucket "${name}" has no default encryption`,
          description: `Bucket ${name} does not have default server-side encryption enabled. Objects stored without explicit encryption will be unencrypted at rest.`,
          severity: 'HIGH',
          resource: arn,
          cisBenchmark: '2.1.1',
        });
      }
    }
  }

  async checkBucketVersioning(name, arn) {
    try {
      const res = await this.s3.send(new GetBucketVersioningCommand({ Bucket: name }));
      if (res.Status !== 'Enabled') {
        this._finding({
          title: `S3 bucket "${name}" versioning not enabled`,
          description: `Bucket ${name} does not have versioning enabled. Without versioning, deleted or overwritten objects cannot be recovered.`,
          severity: 'MEDIUM',
          resource: arn,
          cisBenchmark: '2.1.3',
        });
      }
    } catch (e) {
      console.error(`S3 checkBucketVersioning error for ${name}:`, e.message);
    }
  }

  async checkBucketLogging(name, arn) {
    try {
      const res = await this.s3.send(new GetBucketLoggingCommand({ Bucket: name }));
      if (!res.LoggingEnabled) {
        this._finding({
          title: `S3 bucket "${name}" access logging not enabled`,
          description: `Bucket ${name} does not have server access logging enabled. Without logging, access patterns and potential data exfiltration cannot be detected.`,
          severity: 'MEDIUM',
          resource: arn,
          cisBenchmark: '2.1.2',
        });
      }
    } catch (e) {
      console.error(`S3 checkBucketLogging error for ${name}:`, e.message);
    }
  }

  async checkBucketPolicyPublic(name, arn) {
    try {
      const res = await this.s3.send(new GetBucketPolicyStatusCommand({ Bucket: name }));
      if (res.PolicyStatus && res.PolicyStatus.IsPublic) {
        this._finding({
          title: `S3 bucket "${name}" policy allows public access`,
          description: `Bucket ${name} has a bucket policy that allows public access. This could lead to unauthorized data exposure.`,
          severity: 'CRITICAL',
          resource: arn,
          cisBenchmark: '2.1.5',
        });
      }
    } catch (e) {
      // No policy = not public
    }
  }

  async checkSSLEnforcement(name, arn) {
    try {
      const res = await this.s3.send(new GetBucketPolicyCommand({ Bucket: name }));
      const policy = JSON.parse(res.Policy);
      const statements = Array.isArray(policy.Statement) ? policy.Statement : [policy.Statement];
      const hasSSLDeny = statements.some(stmt =>
        stmt.Effect === 'Deny' &&
        stmt.Condition &&
        stmt.Condition.Bool &&
        stmt.Condition.Bool['aws:SecureTransport'] === 'false'
      );
      if (!hasSSLDeny) {
        this._finding({
          title: `S3 bucket "${name}" does not enforce SSL-only access`,
          description: `Bucket ${name} has a bucket policy but does not deny non-SSL requests. Data in transit could be intercepted.`,
          severity: 'MEDIUM',
          resource: arn,
          cisBenchmark: '2.1.1',
        });
      }
    } catch (e) {
      // No policy at all — can't enforce SSL via policy
    }
  }
}
