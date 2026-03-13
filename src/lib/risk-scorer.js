const SEVERITY_WEIGHTS = {
  CRITICAL: 10,
  HIGH: 7,
  MEDIUM: 4,
  LOW: 1,
  INFO: 0,
};

const BLAST_RADIUS = {
  IAM: 1.5,
  CloudTrail: 1.4,
  S3: 1.3,
  KMS: 1.3,
  VPC: 1.2,
  EC2: 1.0,
};

export function calculateRiskScore(findings) {
  if (!findings || findings.length === 0) return 0;

  const maxPossiblePerFinding = SEVERITY_WEIGHTS.CRITICAL * Math.max(...Object.values(BLAST_RADIUS));
  const maxPossible = findings.length * maxPossiblePerFinding;

  let totalScore = 0;
  for (const f of findings) {
    const weight = SEVERITY_WEIGHTS[f.severity] || 0;
    const radius = BLAST_RADIUS[f.category] || 1.0;
    totalScore += weight * radius;
  }

  return Math.min(100, Math.round((totalScore / maxPossible) * 100));
}

export function getSeverityCounts(findings) {
  const counts = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, INFO: 0 };
  for (const f of findings) {
    if (counts[f.severity] !== undefined) {
      counts[f.severity]++;
    }
  }
  return counts;
}
