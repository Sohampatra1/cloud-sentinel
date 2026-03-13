import {
  GetAccountSummaryCommand,
  GetAccountPasswordPolicyCommand,
  ListUsersCommand,
  GetLoginProfileCommand,
  ListMFADevicesCommand,
  ListAccessKeysCommand,
  GetAccessKeyLastUsedCommand,
  ListAttachedUserPoliciesCommand,
  ListPoliciesCommand,
  GetPolicyVersionCommand,
} from '@aws-sdk/client-iam';
import { getIAMClient } from '../aws-clients';
import { BaseScanner } from './base';

export class IAMScanner extends BaseScanner {
  constructor() {
    super('IAM');
    this.client = getIAMClient();
  }

  async scan() {
    await Promise.allSettled([
      this.checkRootMFA(),
      this.checkPasswordPolicy(),
      this.checkUsersMFA(),
      this.checkAccessKeys(),
      this.checkAdminAccess(),
      this.checkWildcardPolicies(),
    ]);
    return this.findings;
  }

  async checkRootMFA() {
    try {
      const res = await this.client.send(new GetAccountSummaryCommand({}));
      const summary = res.SummaryMap;
      if (!summary.AccountMFAEnabled) {
        this._finding({
          title: 'Root account MFA not enabled',
          description: 'The AWS root account does not have Multi-Factor Authentication enabled. The root account has unrestricted access to all resources and is the highest-privilege identity in the account. Without MFA, a compromised password grants full account access.',
          severity: 'CRITICAL',
          resource: 'arn:aws:iam::root',
          cisBenchmark: '1.5',
        });
      }
    } catch (e) {
      console.error('IAM checkRootMFA error:', e.message);
    }
  }

  async checkPasswordPolicy() {
    try {
      const res = await this.client.send(new GetAccountPasswordPolicyCommand({}));
      const policy = res.PasswordPolicy;

      if (policy.MinimumPasswordLength < 14) {
        this._finding({
          title: 'Password policy minimum length below 14 characters',
          description: `Current minimum password length is ${policy.MinimumPasswordLength}. CIS recommends at least 14 characters to resist brute-force attacks.`,
          severity: 'MEDIUM',
          resource: 'arn:aws:iam::account-password-policy',
          cisBenchmark: '1.8',
        });
      }

      if (!policy.RequireUppercaseCharacters) {
        this._finding({
          title: 'Password policy does not require uppercase characters',
          description: 'The account password policy does not require uppercase letters, reducing password complexity.',
          severity: 'MEDIUM',
          resource: 'arn:aws:iam::account-password-policy',
          cisBenchmark: '1.9',
        });
      }

      if (!policy.MaxPasswordAge || policy.MaxPasswordAge > 90) {
        this._finding({
          title: 'Password expiry exceeds 90 days or not set',
          description: 'Passwords should expire within 90 days to limit the window of credential compromise.',
          severity: 'MEDIUM',
          resource: 'arn:aws:iam::account-password-policy',
          cisBenchmark: '1.11',
        });
      }
    } catch (e) {
      if (e.name === 'NoSuchEntityException') {
        this._finding({
          title: 'No password policy configured',
          description: 'The AWS account has no custom password policy. Default AWS settings allow weak passwords. A strong password policy is a fundamental security control.',
          severity: 'HIGH',
          resource: 'arn:aws:iam::account-password-policy',
          cisBenchmark: '1.8',
        });
      } else {
        console.error('IAM checkPasswordPolicy error:', e.message);
      }
    }
  }

  async checkUsersMFA() {
    try {
      const res = await this.client.send(new ListUsersCommand({ MaxItems: 100 }));
      const users = res.Users || [];

      for (const user of users.slice(0, 100)) {
        try {
          await this.client.send(new GetLoginProfileCommand({ UserName: user.UserName }));
          const mfaRes = await this.client.send(new ListMFADevicesCommand({ UserName: user.UserName }));
          if (!mfaRes.MFADevices || mfaRes.MFADevices.length === 0) {
            this._finding({
              title: `Console user "${user.UserName}" without MFA`,
              description: `IAM user ${user.UserName} has console access but no MFA device configured. If credentials are compromised, an attacker can access the AWS Console without any second factor.`,
              severity: 'HIGH',
              resource: user.Arn,
              cisBenchmark: '1.10',
            });
          }
        } catch (e) {
          if (e.name !== 'NoSuchEntityException') {
            console.error(`IAM checkUserMFA error for ${user.UserName}:`, e.message);
          }
        }
      }
    } catch (e) {
      console.error('IAM checkUsersMFA error:', e.message);
    }
  }

  async checkAccessKeys() {
    try {
      const res = await this.client.send(new ListUsersCommand({ MaxItems: 100 }));
      const users = res.Users || [];

      for (const user of users.slice(0, 100)) {
        try {
          const keysRes = await this.client.send(new ListAccessKeysCommand({ UserName: user.UserName }));
          for (const key of keysRes.AccessKeyMetadata || []) {
            if (key.Status !== 'Active') continue;

            const age = Math.floor((Date.now() - new Date(key.CreateDate).getTime()) / (1000 * 60 * 60 * 24));
            if (age > 90) {
              this._finding({
                title: `Access key older than 90 days for "${user.UserName}"`,
                description: `Access key ${key.AccessKeyId} is ${age} days old. Old keys increase risk of credential exposure. Rotate keys every 90 days.`,
                severity: 'HIGH',
                resource: user.Arn,
                cisBenchmark: '1.14',
              });
            }

            try {
              const lastUsed = await this.client.send(new GetAccessKeyLastUsedCommand({ AccessKeyId: key.AccessKeyId }));
              if (lastUsed.AccessKeyLastUsed && lastUsed.AccessKeyLastUsed.LastUsedDate) {
                const daysSinceUse = Math.floor((Date.now() - new Date(lastUsed.AccessKeyLastUsed.LastUsedDate).getTime()) / (1000 * 60 * 60 * 24));
                if (daysSinceUse > 90) {
                  this._finding({
                    title: `Unused active access key for "${user.UserName}"`,
                    description: `Access key ${key.AccessKeyId} is active but unused for ${daysSinceUse} days. Unused credentials should be deactivated to reduce attack surface.`,
                    severity: 'MEDIUM',
                    resource: user.Arn,
                    cisBenchmark: '1.12',
                  });
                }
              }
            } catch (e) {
              console.error(`IAM getAccessKeyLastUsed error:`, e.message);
            }
          }
        } catch (e) {
          console.error(`IAM checkAccessKeys error for ${user.UserName}:`, e.message);
        }
      }
    } catch (e) {
      console.error('IAM checkAccessKeys error:', e.message);
    }
  }

  async checkAdminAccess() {
    try {
      const res = await this.client.send(new ListUsersCommand({ MaxItems: 100 }));
      const users = res.Users || [];

      for (const user of users.slice(0, 100)) {
        try {
          const policies = await this.client.send(new ListAttachedUserPoliciesCommand({ UserName: user.UserName }));
          for (const policy of policies.AttachedPolicies || []) {
            if (policy.PolicyArn === 'arn:aws:iam::aws:policy/AdministratorAccess') {
              this._finding({
                title: `User "${user.UserName}" has direct AdministratorAccess`,
                description: `IAM user ${user.UserName} has the AdministratorAccess policy directly attached. This grants full access to all AWS services. Use groups and roles with least-privilege policies instead.`,
                severity: 'CRITICAL',
                resource: user.Arn,
                cisBenchmark: '1.16',
              });
            }
          }
        } catch (e) {
          console.error(`IAM checkAdminAccess error for ${user.UserName}:`, e.message);
        }
      }
    } catch (e) {
      console.error('IAM checkAdminAccess error:', e.message);
    }
  }

  async checkWildcardPolicies() {
    try {
      const res = await this.client.send(new ListPoliciesCommand({ Scope: 'Local', MaxItems: 30 }));
      const policies = res.Policies || [];

      for (const policy of policies.slice(0, 30)) {
        try {
          const version = await this.client.send(new GetPolicyVersionCommand({
            PolicyArn: policy.Arn,
            VersionId: policy.DefaultVersionId,
          }));
          const doc = JSON.parse(decodeURIComponent(version.PolicyVersion.Document));
          const statements = Array.isArray(doc.Statement) ? doc.Statement : [doc.Statement];

          for (const stmt of statements) {
            if (stmt.Effect === 'Allow') {
              const actions = Array.isArray(stmt.Action) ? stmt.Action : [stmt.Action];
              const resources = Array.isArray(stmt.Resource) ? stmt.Resource : [stmt.Resource];
              if (actions.includes('*') && resources.includes('*')) {
                this._finding({
                  title: `Custom policy "${policy.PolicyName}" allows *:* (full wildcard)`,
                  description: `Custom IAM policy ${policy.Arn} has a statement allowing all actions on all resources. This is equivalent to AdministratorAccess and violates least-privilege principle.`,
                  severity: 'CRITICAL',
                  resource: policy.Arn,
                  cisBenchmark: '1.16',
                });
                break;
              }
            }
          }
        } catch (e) {
          console.error(`IAM checkWildcardPolicies error for ${policy.PolicyName}:`, e.message);
        }
      }
    } catch (e) {
      console.error('IAM checkWildcardPolicies error:', e.message);
    }
  }
}
