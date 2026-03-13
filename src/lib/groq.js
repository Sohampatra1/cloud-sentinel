import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

async function callGroq(systemPrompt, userPrompt) {
  const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.3,
    response_format: { type: 'json_object' },
  });
  return JSON.parse(response.choices[0].message.content);
}

export async function analyzeFindings(findings) {
  const systemPrompt = `You are an AWS security architect performing a Cloud Security Posture Management (CSPM) analysis. Analyze the provided findings and return a structured JSON assessment. Be specific and actionable. Reference actual finding IDs.`;

  const userPrompt = `Analyze these ${findings.length} AWS security findings and return JSON with this exact structure:
{
  "category_summary": {
    "<category>": { "risk": "HIGH|MEDIUM|LOW", "summary": "..." }
  },
  "top_3_urgent": [
    { "finding_id": "...", "reason": "...", "fix_time": "..." }
  ],
  "quick_wins": [
    { "finding_id": "...", "action": "...", "impact": "..." }
  ],
  "cis_posture": {
    "sections_passing": ["..."],
    "sections_failing": ["..."],
    "estimated_compliance_percentage": 0
  }
}

Findings:
${JSON.stringify(findings, null, 2)}`;

  return callGroq(systemPrompt, userPrompt);
}

export async function identifyAttackPaths(findings) {
  const systemPrompt = `You are a senior penetration tester and red team operator. Analyze combinations of AWS security findings to identify realistic attack chains. Each chain should explain how an attacker could combine multiple weaknesses. Be specific — reference actual finding IDs and describe step-by-step exploitation.`;

  const userPrompt = `Find attack chains in these findings. Look for dangerous combinations like:
- SSH open + No MFA + Old access keys = account takeover
- IMDSv1 + Permissive IAM = SSRF credential theft (Capital One style)
- Public S3 + No CloudTrail + No logging = undetected exfiltration
- No VPC flow logs + Open SGs = network attack without forensics

Return JSON:
{
  "attack_paths": [
    {
      "name": "...",
      "risk_level": "CRITICAL|HIGH|MEDIUM",
      "findings_involved": ["finding-id-1", "finding-id-2"],
      "narrative": "Step-by-step attack narrative...",
      "business_impact": "...",
      "mitigation_priority": "Fix X first — breaks the chain"
    }
  ],
  "overall_assessment": "..."
}

Findings:
${JSON.stringify(findings, null, 2)}`;

  return callGroq(systemPrompt, userPrompt);
}

export async function generateRemediation(finding) {
  const systemPrompt = `You are an AWS security engineer. Generate specific, copy-paste-ready remediation for this AWS security finding. Include exact AWS CLI commands.`;

  const userPrompt = `Generate remediation for this finding. Return JSON:
{
  "risk_explanation": "Business-impact explanation",
  "steps": ["Step 1: ...", "Step 2: ..."],
  "aws_cli_commands": ["aws iam ..."],
  "verification_command": "aws ... to verify fix",
  "estimated_effort": "X minutes",
  "requires_downtime": false
}

Finding:
${JSON.stringify(finding, null, 2)}`;

  return callGroq(systemPrompt, userPrompt);
}

export async function generateExecutiveSummary(findings, riskScore, severityCounts) {
  const systemPrompt = `You are a cloud security consultant preparing a board-ready executive report. Write in professional consulting language (think PwC/Deloitte style). Be authoritative but accessible to non-technical leadership.`;

  const userPrompt = `Generate an executive summary for this AWS security assessment.

Risk Score: ${riskScore}/100
Findings: ${findings.length} total
Critical: ${severityCounts.CRITICAL}, High: ${severityCounts.HIGH}, Medium: ${severityCounts.MEDIUM}, Low: ${severityCounts.LOW}

Return JSON:
{
  "executive_summary": "3-4 paragraphs...",
  "key_risks": [
    { "risk": "...", "business_impact": "...", "urgency": "immediate|short-term|medium-term" }
  ],
  "recommendations": [
    { "action": "...", "timeline": "...", "owner": "..." }
  ],
  "compliance_gaps": ["CIS X.X — description"],
  "maturity_rating": "Initial|Developing|Defined|Managed|Optimized",
  "next_steps": "In the next 7 days..."
}

Top findings for context:
${JSON.stringify(findings.slice(0, 20), null, 2)}`;

  return callGroq(systemPrompt, userPrompt);
}
