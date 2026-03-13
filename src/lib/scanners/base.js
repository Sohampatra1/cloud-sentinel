import crypto from 'crypto';

export class BaseScanner {
  constructor(category) {
    this.category = category;
    this.findings = [];
    this.region = process.env.AWS_REGION || 'ap-south-1';
  }

  _finding({ title, description, severity, resource, cisBenchmark }) {
    const id = `${this.category.toLowerCase()}-${crypto.randomBytes(4).toString('hex')}`;
    this.findings.push({
      findingKey: id,
      category: this.category,
      resource,
      severity,
      title,
      description,
      cisBenchmark: cisBenchmark || 'N/A',
      region: this.region,
    });
  }

  async scan() {
    throw new Error('scan() must be implemented by subclass');
  }
}
