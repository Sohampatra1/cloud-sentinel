import {
  DescribeVpcsCommand,
  DescribeFlowLogsCommand,
  DescribeSecurityGroupsCommand,
  DescribeSubnetsCommand,
  DescribeInstancesCommand,
} from '@aws-sdk/client-ec2';
import { getEC2Client } from '../aws-clients';
import { BaseScanner } from './base';

export class VPCScanner extends BaseScanner {
  constructor() {
    super('VPC');
    this.client = getEC2Client();
  }

  async scan() {
    await Promise.allSettled([
      this.checkVPCFlowLogs(),
      this.checkDefaultVPC(),
      this.checkDefaultSecurityGroups(),
      this.checkPublicSubnets(),
    ]);
    return this.findings;
  }

  async checkVPCFlowLogs() {
    try {
      const vpcs = await this.client.send(new DescribeVpcsCommand({}));
      for (const vpc of vpcs.Vpcs || []) {
        const flowLogs = await this.client.send(new DescribeFlowLogsCommand({
          Filter: [{ Name: 'resource-id', Values: [vpc.VpcId] }],
        }));

        const logs = flowLogs.FlowLogs || [];
        if (logs.length === 0) {
          this._finding({
            title: `VPC ${vpc.VpcId} has no flow logs`,
            description: `VPC ${vpc.VpcId} does not have flow logs enabled. Without flow logs, network traffic cannot be monitored or analyzed for security incidents.`,
            severity: 'HIGH',
            resource: vpc.VpcId,
            cisBenchmark: '3.9',
          });
          continue;
        }

        for (const log of logs) {
          if (log.FlowLogStatus !== 'ACTIVE') {
            this._finding({
              title: `VPC ${vpc.VpcId} flow log ${log.FlowLogId} is inactive`,
              description: `Flow log ${log.FlowLogId} for VPC ${vpc.VpcId} has status ${log.FlowLogStatus}. Inactive flow logs provide no visibility.`,
              severity: 'HIGH',
              resource: vpc.VpcId,
              cisBenchmark: '3.9',
            });
          }

          if (log.TrafficType !== 'ALL') {
            this._finding({
              title: `VPC ${vpc.VpcId} flow log only captures ${log.TrafficType} traffic`,
              description: `Flow log ${log.FlowLogId} only captures ${log.TrafficType} traffic. Set to ALL to capture both accepted and rejected traffic for full visibility.`,
              severity: 'MEDIUM',
              resource: vpc.VpcId,
              cisBenchmark: '3.9',
            });
          }
        }
      }
    } catch (e) {
      console.error('VPC checkFlowLogs error:', e.message);
    }
  }

  async checkDefaultVPC() {
    try {
      const vpcs = await this.client.send(new DescribeVpcsCommand({
        Filters: [{ Name: 'isDefault', Values: ['true'] }],
      }));

      for (const vpc of vpcs.Vpcs || []) {
        const instances = await this.client.send(new DescribeInstancesCommand({
          Filters: [
            { Name: 'vpc-id', Values: [vpc.VpcId] },
            { Name: 'instance-state-name', Values: ['running'] },
          ],
        }));

        const count = (instances.Reservations || []).reduce((sum, r) => sum + (r.Instances?.length || 0), 0);
        if (count > 0) {
          this._finding({
            title: `Default VPC ${vpc.VpcId} has ${count} running instance(s)`,
            description: `The default VPC ${vpc.VpcId} has ${count} running instances. Default VPCs have permissive network configurations. Use custom VPCs with proper network segmentation.`,
            severity: 'MEDIUM',
            resource: vpc.VpcId,
            cisBenchmark: '5.4',
          });
        }
      }
    } catch (e) {
      console.error('VPC checkDefaultVPC error:', e.message);
    }
  }

  async checkDefaultSecurityGroups() {
    try {
      const res = await this.client.send(new DescribeSecurityGroupsCommand({
        Filters: [{ Name: 'group-name', Values: ['default'] }],
      }));

      for (const sg of res.SecurityGroups || []) {
        if ((sg.IpPermissions || []).length > 0) {
          this._finding({
            title: `Default security group ${sg.GroupId} has ingress rules`,
            description: `The default security group ${sg.GroupId} in VPC ${sg.VpcId} has inbound rules configured. CIS recommends default security groups restrict all traffic. Resources accidentally placed here may be exposed.`,
            severity: 'HIGH',
            resource: sg.GroupId,
            cisBenchmark: '5.4',
          });
        }
      }
    } catch (e) {
      console.error('VPC checkDefaultSecurityGroups error:', e.message);
    }
  }

  async checkPublicSubnets() {
    try {
      const res = await this.client.send(new DescribeSubnetsCommand({}));
      for (const subnet of res.Subnets || []) {
        if (subnet.MapPublicIpOnLaunch) {
          this._finding({
            title: `Subnet ${subnet.SubnetId} auto-assigns public IPs`,
            description: `Subnet ${subnet.SubnetId} in VPC ${subnet.VpcId} automatically assigns public IPs to launched instances. This increases attack surface.`,
            severity: 'MEDIUM',
            resource: subnet.SubnetId,
            cisBenchmark: '5.1',
          });
        }
      }
    } catch (e) {
      console.error('VPC checkPublicSubnets error:', e.message);
    }
  }
}
