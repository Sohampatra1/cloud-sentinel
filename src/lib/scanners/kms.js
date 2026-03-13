import {
  ListKeysCommand,
  DescribeKeyCommand,
  GetKeyRotationStatusCommand,
  GetKeyPolicyCommand,
} from '@aws-sdk/client-kms';
import { getKMSClient } from '../aws-clients';
import { BaseScanner } from './base';

export class KMSScanner extends BaseScanner {
  constructor() {
    super('KMS');
    this.client = getKMSClient();
  }

  async scan() {
    try {
      const res = await this.client.send(new ListKeysCommand({ Limit: 30 }));
      const keys = (res.Keys || []).slice(0, 30);

      for (const key of keys) {
        try {
          const desc = await this.client.send(new DescribeKeyCommand({ KeyId: key.KeyId }));
          const metadata = desc.KeyMetadata;

          // Skip AWS-managed keys
          if (metadata.KeyManager === 'AWS') continue;

          const arn = metadata.Arn;

          if (metadata.KeyState === 'PendingDeletion') {
            this._finding({
              title: `KMS key ${key.KeyId} is pending deletion`,
              description: `KMS key ${arn} is scheduled for deletion. Any data encrypted with this key will become permanently inaccessible.`,
              severity: 'LOW',
              resource: arn,
              cisBenchmark: 'N/A',
            });
            continue;
          }

          if (metadata.KeyState === 'Disabled') {
            this._finding({
              title: `KMS key ${key.KeyId} is disabled`,
              description: `KMS key ${arn} is disabled. Resources depending on this key cannot encrypt/decrypt data.`,
              severity: 'LOW',
              resource: arn,
              cisBenchmark: 'N/A',
            });
            continue;
          }

          // Check rotation
          try {
            const rotation = await this.client.send(new GetKeyRotationStatusCommand({ KeyId: key.KeyId }));
            if (!rotation.KeyRotationEnabled) {
              this._finding({
                title: `KMS key ${key.KeyId} does not have automatic rotation`,
                description: `Customer-managed KMS key ${arn} does not have automatic annual rotation enabled. Key rotation limits the amount of data encrypted under one key version.`,
                severity: 'MEDIUM',
                resource: arn,
                cisBenchmark: '3.8',
              });
            }
          } catch (e) {
            console.error(`KMS getKeyRotationStatus error for ${key.KeyId}:`, e.message);
          }

          // Check key policy for wildcard principal
          try {
            const policy = await this.client.send(new GetKeyPolicyCommand({ KeyId: key.KeyId, PolicyName: 'default' }));
            const doc = JSON.parse(policy.Policy);
            const statements = Array.isArray(doc.Statement) ? doc.Statement : [doc.Statement];

            for (const stmt of statements) {
              if (stmt.Effect === 'Allow') {
                const principals = stmt.Principal;
                const hasStar = principals === '*' ||
                  (principals?.AWS && (principals.AWS === '*' || (Array.isArray(principals.AWS) && principals.AWS.includes('*'))));
                if (hasStar) {
                  // Allow root account principal — that's standard
                  const isRootOnly = principals?.AWS && typeof principals.AWS === 'string' && principals.AWS.match(/arn:aws:iam::\d+:root/);
                  if (!isRootOnly) {
                    this._finding({
                      title: `KMS key ${key.KeyId} policy allows wildcard principal`,
                      description: `KMS key ${arn} has a key policy that allows Principal "*". This could grant any AWS principal access to encryption operations on this key.`,
                      severity: 'CRITICAL',
                      resource: arn,
                      cisBenchmark: '2.8',
                    });
                  }
                }
              }
            }
          } catch (e) {
            console.error(`KMS getKeyPolicy error for ${key.KeyId}:`, e.message);
          }
        } catch (e) {
          console.error(`KMS describeKey error for ${key.KeyId}:`, e.message);
        }
      }
    } catch (e) {
      console.error('KMS scan error:', e.message);
    }
    return this.findings;
  }
}
