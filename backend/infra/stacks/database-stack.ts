import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';

export class DatabaseStack extends cdk.Stack {
  public readonly vpc: ec2.Vpc;
  public readonly database: rds.DatabaseCluster;
  public readonly databaseSecret: secretsmanager.ISecret;
  public readonly lambdaSecurityGroup: ec2.SecurityGroup;
  public readonly callLogsTable: dynamodb.Table;
  public readonly agentSessionsTable: dynamodb.Table;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ========================================
    // VPC for Aurora Cluster
    // ========================================
    this.vpc = new ec2.Vpc(this, 'ConsultIA-VPC', {
      maxAzs: 2, // Multi-AZ for high availability
      natGateways: 1, // 1 NAT Gateway to reduce costs (can increase to 2 for HA)
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'public',
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          cidrMask: 24,
          name: 'private',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
        {
          cidrMask: 28,
          name: 'isolated',
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
        },
      ],
    });

    // ========================================
    // Aurora Serverless v2 PostgreSQL
    // ========================================

    // Database credentials (stored in Secrets Manager)
    const databaseCredentials = new secretsmanager.Secret(this, 'DatabaseCredentials', {
      secretName: 'consultia/database/credentials',
      description: 'Aurora PostgreSQL master credentials',
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ username: 'postgres' }),
        generateStringKey: 'password',
        excludePunctuation: true,
        includeSpace: false,
        passwordLength: 32,
      },
    });

    this.databaseSecret = databaseCredentials;

    // Parameter Group for PostgreSQL 15
    const parameterGroup = new rds.ParameterGroup(this, 'AuroraParameterGroup', {
      engine: rds.DatabaseClusterEngine.auroraPostgres({
        version: rds.AuroraPostgresEngineVersion.VER_15_13,
      }),
      description: 'Parameter group for ConsultIA Aurora PostgreSQL 15',
      parameters: {
        'shared_preload_libraries': 'pg_stat_statements',
        'log_statement': 'all',
        'log_min_duration_statement': '1000', // Log queries > 1s
      },
    });

    // Aurora Serverless v2 Cluster
    this.database = new rds.DatabaseCluster(this, 'AuroraCluster', {
      engine: rds.DatabaseClusterEngine.auroraPostgres({
        version: rds.AuroraPostgresEngineVersion.VER_15_13,
      }),
      credentials: rds.Credentials.fromSecret(databaseCredentials),
      defaultDatabaseName: 'consultia',
      parameterGroup,
      vpc: this.vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
      },
      serverlessV2MinCapacity: 0.5, // Minimum 0.5 ACU (~$0.08/hour)
      serverlessV2MaxCapacity: 16, // Maximum 16 ACU (auto-scales)
      writer: rds.ClusterInstance.serverlessV2('writer', {
        publiclyAccessible: false,
      }),
      readers: [
        rds.ClusterInstance.serverlessV2('reader1', {
          scaleWithWriter: true, // Auto-scale readers with writer
          publiclyAccessible: false,
        }),
      ],
      backup: {
        retention: cdk.Duration.days(7), // 7-day backup retention
        preferredWindow: '03:00-04:00', // Backup window (3-4 AM UTC)
      },
      storageEncrypted: true, // Encrypt at rest
      deletionProtection: true, // Prevent accidental deletion (IMPORTANT!)
    });

    // ========================================
    // Lambda Security Group (shared by all Lambdas that access DB)
    // ========================================
    this.lambdaSecurityGroup = new ec2.SecurityGroup(this, 'LambdaSecurityGroup', {
      vpc: this.vpc,
      description: 'Security group for Lambda functions accessing Aurora',
      allowAllOutbound: true,
    });

    // Allow Lambda SG to connect to Aurora on PostgreSQL port
    this.database.connections.allowDefaultPortFrom(this.lambdaSecurityGroup);

    // ========================================
    // DynamoDB Tables
    // ========================================

    // Table: call_logs (high-throughput call data)
    this.callLogsTable = new dynamodb.Table(this, 'CallLogsTable', {
      tableName: 'consultia-call-logs',
      partitionKey: {
        name: 'customer_id',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'call_timestamp',
        type: dynamodb.AttributeType.NUMBER,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST, // On-demand pricing
      timeToLiveAttribute: 'ttl', // Auto-delete old records
      pointInTimeRecovery: true, // Enable PITR backups
      encryption: dynamodb.TableEncryption.AWS_MANAGED, // Encrypt at rest
      stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES, // Enable streams for analytics
    });

    // GSI: Query by agent_id
    this.callLogsTable.addGlobalSecondaryIndex({
      indexName: 'agent_id-index',
      partitionKey: {
        name: 'agent_id',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'call_timestamp',
        type: dynamodb.AttributeType.NUMBER,
      },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // GSI: Query by call_sid (Twilio Call SID)
    this.callLogsTable.addGlobalSecondaryIndex({
      indexName: 'call_sid-index',
      partitionKey: {
        name: 'call_sid',
        type: dynamodb.AttributeType.STRING,
      },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // Table: agent_sessions (conversation analysis)
    this.agentSessionsTable = new dynamodb.Table(this, 'AgentSessionsTable', {
      tableName: 'consultia-agent-sessions',
      partitionKey: {
        name: 'agent_id',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'session_timestamp',
        type: dynamodb.AttributeType.NUMBER,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      timeToLiveAttribute: 'ttl',
      pointInTimeRecovery: true,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
    });

    // GSI: Query by customer_id
    this.agentSessionsTable.addGlobalSecondaryIndex({
      indexName: 'customer_id-index',
      partitionKey: {
        name: 'customer_id',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'session_timestamp',
        type: dynamodb.AttributeType.NUMBER,
      },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // ========================================
    // Outputs
    // ========================================
    new cdk.CfnOutput(this, 'AuroraClusterEndpoint', {
      value: this.database.clusterEndpoint.hostname,
      description: 'Aurora PostgreSQL cluster endpoint',
      exportName: 'ConsultIA-Database-ClusterEndpoint',
    });

    new cdk.CfnOutput(this, 'DatabaseSecretArn', {
      value: databaseCredentials.secretArn,
      description: 'ARN of database credentials secret',
      exportName: 'ConsultIA-Database-SecretArn',
    });

    new cdk.CfnOutput(this, 'CallLogsTableName', {
      value: this.callLogsTable.tableName,
      description: 'DynamoDB call logs table name',
      exportName: 'ConsultIA-CallLogsTable',
    });

    new cdk.CfnOutput(this, 'AgentSessionsTableName', {
      value: this.agentSessionsTable.tableName,
      description: 'DynamoDB agent sessions table name',
      exportName: 'ConsultIA-AgentSessionsTable',
    });
  }
}
