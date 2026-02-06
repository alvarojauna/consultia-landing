import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

export class StorageStack extends cdk.Stack {
  public readonly knowledgeBaseBucket: s3.Bucket;
  public readonly recordingsBucket: s3.Bucket;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ========================================
    // S3 Bucket: Knowledge Base Files
    // ========================================
    this.knowledgeBaseBucket = new s3.Bucket(this, 'KnowledgeBaseBucket', {
      bucketName: `consultia-knowledge-bases-${this.account}`,
      versioned: false,
      encryption: s3.BucketEncryption.S3_MANAGED, // SSE-S3 encryption
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true, // Require HTTPS for uploads/downloads
      lifecycleRules: [
        {
          id: 'delete-old-files',
          enabled: true,
          expiration: cdk.Duration.days(365), // Delete after 1 year
        },
      ],
      cors: [
        {
          allowedMethods: [
            s3.HttpMethods.GET,
            s3.HttpMethods.PUT,
            s3.HttpMethods.POST,
          ],
          allowedOrigins: [
            'https://consultia.es',
            'https://*.consultia.es',
            'http://localhost:3000', // Development
          ],
          allowedHeaders: ['*'],
          maxAge: 3000,
        },
      ],
    });

    // ========================================
    // S3 Bucket: Call Recordings
    // ========================================
    this.recordingsBucket = new s3.Bucket(this, 'RecordingsBucket', {
      bucketName: `consultia-call-recordings-${this.account}`,
      versioned: false,
      encryption: s3.BucketEncryption.KMS, // KMS encryption for sensitive data
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      lifecycleRules: [
        {
          id: 'transition-to-glacier',
          enabled: true,
          transitions: [
            {
              storageClass: s3.StorageClass.GLACIER,
              transitionAfter: cdk.Duration.days(90), // Move to Glacier after 90 days
            },
          ],
          expiration: cdk.Duration.days(2555), // Delete after 7 years (legal retention)
        },
      ],
    });

    // ========================================
    // Outputs
    // ========================================
    new cdk.CfnOutput(this, 'KnowledgeBaseBucketName', {
      value: this.knowledgeBaseBucket.bucketName,
      description: 'S3 bucket for knowledge base files (PDFs, DOCX, etc.)',
      exportName: 'ConsultIA-KnowledgeBaseBucket',
    });

    new cdk.CfnOutput(this, 'RecordingsBucketName', {
      value: this.recordingsBucket.bucketName,
      description: 'S3 bucket for call recordings',
      exportName: 'ConsultIA-RecordingsBucket',
    });
  }
}
