import {
  DescribeTrailsCommand,
  GetTrailStatusCommand,
  GetEventSelectorsCommand,
} from '@aws-sdk/client-cloudtrail';
import { getCloudTrailClient } from '../aws-clients';
import { BaseScanner } from './base';

export class CloudTrailScanner extends BaseScanner {
  constructor() {
    super('CloudTrail');
    this.client = getCloudTrailClient();
  }

  async scan() {
    try {
      const res = await this.client.send(new DescribeTrailsCommand({}));
      const trails = res.trailList || [];

      if (trails.length === 0) {
        this._finding({
          title: 'No CloudTrail trails configured',
          description: 'No CloudTrail trails exist in this account. Without CloudTrail, API activity is not logged and security incidents cannot be investigated. This is the most fundamental AWS logging control.',
          severity: 'CRITICAL',
          resource: `arn:aws:cloudtrail:${this.region}::no-trails`,
          cisBenchmark: '3.1',
        });
        return this.findings;
      }

      const hasMultiRegion = trails.some(t => t.IsMultiRegionTrail);
      if (!hasMultiRegion) {
        this._finding({
          title: 'No multi-region CloudTrail trail',
          description: 'No trail is configured for multi-region logging. API calls in other regions will not be captured, creating blind spots for attackers operating outside this region.',
          severity: 'HIGH',
          resource: `arn:aws:cloudtrail:${this.region}::trails`,
          cisBenchmark: '3.1',
        });
      }

      for (const trail of trails) {
        const arn = trail.TrailARN;

        if (!trail.LogFileValidationEnabled) {
          this._finding({
            title: `CloudTrail "${trail.Name}" log file validation disabled`,
            description: `Trail ${trail.Name} does not validate log file integrity. An attacker could modify or delete logs without detection.`,
            severity: 'HIGH',
            resource: arn,
            cisBenchmark: '3.2',
          });
        }

        if (!trail.KmsKeyId) {
          this._finding({
            title: `CloudTrail "${trail.Name}" not encrypted with KMS`,
            description: `Trail ${trail.Name} logs are not encrypted with a KMS key. Logs may contain sensitive information and should be encrypted at rest.`,
            severity: 'MEDIUM',
            resource: arn,
            cisBenchmark: '3.7',
          });
        }

        if (!trail.CloudWatchLogsLogGroupArn) {
          this._finding({
            title: `CloudTrail "${trail.Name}" has no CloudWatch integration`,
            description: `Trail ${trail.Name} does not send logs to CloudWatch. Without CloudWatch integration, real-time alerting on suspicious API activity is not possible.`,
            severity: 'MEDIUM',
            resource: arn,
            cisBenchmark: '3.4',
          });
        }

        // Check if trail is logging
        try {
          const status = await this.client.send(new GetTrailStatusCommand({ Name: trail.Name }));
          if (!status.IsLogging) {
            this._finding({
              title: `CloudTrail "${trail.Name}" exists but logging is stopped`,
              description: `Trail ${trail.Name} is configured but not currently logging. API activity is not being recorded. This could indicate the trail was intentionally disabled by an attacker.`,
              severity: 'CRITICAL',
              resource: arn,
              cisBenchmark: '3.1',
            });
          }
        } catch (e) {
          console.error(`CloudTrail getTrailStatus error for ${trail.Name}:`, e.message);
        }

        // Check event selectors
        try {
          const selectors = await this.client.send(new GetEventSelectorsCommand({ TrailName: trail.Name }));
          const eventSelectors = selectors.EventSelectors || [];
          const capturesAll = eventSelectors.some(s => s.ReadWriteType === 'All');
          if (!capturesAll && eventSelectors.length > 0) {
            this._finding({
              title: `CloudTrail "${trail.Name}" not capturing all event types`,
              description: `Trail ${trail.Name} is not configured to capture both read and write events. Some API activity may go unlogged.`,
              severity: 'MEDIUM',
              resource: arn,
              cisBenchmark: '3.1',
            });
          }
        } catch (e) {
          console.error(`CloudTrail getEventSelectors error for ${trail.Name}:`, e.message);
        }
      }
    } catch (e) {
      console.error('CloudTrail scan error:', e.message);
    }
    return this.findings;
  }
}
