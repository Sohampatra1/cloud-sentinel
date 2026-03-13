import {
  DescribeSecurityGroupsCommand,
  GetEbsEncryptionByDefaultCommand,
  DescribeVolumesCommand,
  DescribeInstancesCommand,
} from '@aws-sdk/client-ec2';
import { getEC2Client } from '../aws-clients';
import { BaseScanner } from './base';

const DANGEROUS_PORTS = {
  22: { name: 'SSH', cis: '5.2', severity: 'CRITICAL' },
  3389: { name: 'RDP', cis: '5.3', severity: 'CRITICAL' },
  3306: { name: 'MySQL', cis: '5.2', severity: 'HIGH' },
  5432: { name: 'PostgreSQL', cis: '5.2', severity: 'HIGH' },
  27017: { name: 'MongoDB', cis: '5.2', severity: 'HIGH' },
  6379: { name: 'Redis', cis: '5.2', severity: 'HIGH' },
  9200: { name: 'Elasticsearch', cis: '5.2', severity: 'HIGH' },
};

export class EC2Scanner extends BaseScanner {
  constructor() {
    super('EC2');
    this.client = getEC2Client();
  }

  async scan() {
    await Promise.allSettled([
      this.checkSecurityGroups(),
      this.checkEBSEncryption(),
      this.checkEBSVolumes(),
      this.checkInstances(),
    ]);
    return this.findings;
  }

  async checkSecurityGroups() {
    try {
      const res = await this.client.send(new DescribeSecurityGroupsCommand({}));
      const sgs = res.SecurityGroups || [];

      for (const sg of sgs) {
        for (const rule of sg.IpPermissions || []) {
          const fromPort = rule.FromPort;
          const toPort = rule.ToPort;

          // Check for all ports open
          if (fromPort === 0 && toPort === 65535) {
            const hasOpenV4 = (rule.IpRanges || []).some(r => r.CidrIp === '0.0.0.0/0');
            const hasOpenV6 = (rule.Ipv6Ranges || []).some(r => r.CidrIpv6 === '::/0');
            if (hasOpenV4 || hasOpenV6) {
              this._finding({
                title: `Security Group "${sg.GroupName}" has ALL ports open to the internet`,
                description: `Security group ${sg.GroupId} (${sg.GroupName}) allows inbound traffic on ALL ports (0-65535) from ${hasOpenV4 ? '0.0.0.0/0' : '::/0'}. This exposes every service to the internet.`,
                severity: 'CRITICAL',
                resource: sg.GroupId,
                cisBenchmark: '5.1',
              });
              continue;
            }
          }

          // Check specific dangerous ports
          for (const [portStr, info] of Object.entries(DANGEROUS_PORTS)) {
            const port = parseInt(portStr);
            if (fromPort <= port && toPort >= port) {
              const openV4 = (rule.IpRanges || []).filter(r => r.CidrIp === '0.0.0.0/0');
              const openV6 = (rule.Ipv6Ranges || []).filter(r => r.CidrIpv6 === '::/0');

              if (openV4.length > 0) {
                this._finding({
                  title: `Security Group "${sg.GroupName}" has ${info.name} (${port}) open to 0.0.0.0/0`,
                  description: `Security group ${sg.GroupId} allows inbound ${info.name} (port ${port}) from any IPv4 address. This exposes the service to brute-force and exploitation attempts from the entire internet.`,
                  severity: info.severity,
                  resource: sg.GroupId,
                  cisBenchmark: info.cis,
                });
              }
              if (openV6.length > 0) {
                this._finding({
                  title: `Security Group "${sg.GroupName}" has ${info.name} (${port}) open to ::/0`,
                  description: `Security group ${sg.GroupId} allows inbound ${info.name} (port ${port}) from any IPv6 address.`,
                  severity: info.severity,
                  resource: sg.GroupId,
                  cisBenchmark: info.cis,
                });
              }
            }
          }
        }
      }
    } catch (e) {
      console.error('EC2 checkSecurityGroups error:', e.message);
    }
  }

  async checkEBSEncryption() {
    try {
      const res = await this.client.send(new GetEbsEncryptionByDefaultCommand({}));
      if (!res.EbsEncryptionByDefault) {
        this._finding({
          title: 'EBS default encryption is not enabled',
          description: 'EBS volumes are not encrypted by default in this region. New volumes created without explicit encryption settings will store data unencrypted.',
          severity: 'HIGH',
          resource: `arn:aws:ec2:${this.region}::ebs-default-encryption`,
          cisBenchmark: '2.2.1',
        });
      }
    } catch (e) {
      console.error('EC2 checkEBSEncryption error:', e.message);
    }
  }

  async checkEBSVolumes() {
    try {
      const res = await this.client.send(new DescribeVolumesCommand({}));
      for (const vol of (res.Volumes || []).slice(0, 50)) {
        if (!vol.Encrypted) {
          this._finding({
            title: `EBS volume ${vol.VolumeId} is not encrypted`,
            description: `EBS volume ${vol.VolumeId} (${vol.Size}GB, ${vol.State}) is not encrypted. Data at rest on this volume is unprotected.`,
            severity: 'HIGH',
            resource: vol.VolumeId,
            cisBenchmark: '2.2.1',
          });
        }
      }
    } catch (e) {
      console.error('EC2 checkEBSVolumes error:', e.message);
    }
  }

  async checkInstances() {
    try {
      const res = await this.client.send(new DescribeInstancesCommand({}));
      for (const reservation of res.Reservations || []) {
        for (const instance of reservation.Instances || []) {
          if (instance.State?.Name !== 'running') continue;

          // Check IMDSv2
          if (instance.MetadataOptions?.HttpTokens !== 'required') {
            this._finding({
              title: `Instance ${instance.InstanceId} does not enforce IMDSv2`,
              description: `EC2 instance ${instance.InstanceId} allows IMDSv1 (HttpTokens: ${instance.MetadataOptions?.HttpTokens || 'optional'}). IMDSv1 is vulnerable to SSRF attacks that can steal instance credentials (as in the Capital One breach).`,
              severity: 'HIGH',
              resource: instance.InstanceId,
              cisBenchmark: '5.6',
            });
          }

          // Check public IP
          if (instance.PublicIpAddress) {
            this._finding({
              title: `Instance ${instance.InstanceId} has a public IP`,
              description: `EC2 instance ${instance.InstanceId} has public IP ${instance.PublicIpAddress}. Publicly accessible instances increase attack surface. Use load balancers or bastion hosts instead.`,
              severity: 'MEDIUM',
              resource: instance.InstanceId,
              cisBenchmark: '5.1',
            });
          }
        }
      }
    } catch (e) {
      console.error('EC2 checkInstances error:', e.message);
    }
  }
}
