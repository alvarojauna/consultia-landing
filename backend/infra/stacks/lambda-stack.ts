import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import { Construct } from 'constructs';

interface LambdaStackProps extends cdk.StackProps {
  database: rds.DatabaseCluster;
  databaseSecret: secretsmanager.ISecret;
  knowledgeBaseBucket: s3.Bucket;
  recordingsBucket: s3.Bucket;
  callLogsTable: dynamodb.Table;
  agentSessionsTable: dynamodb.Table;
  api: apigateway.RestApi;
  userPool: cognito.UserPool;
}

export class LambdaStack extends cdk.Stack {
  public readonly onboardingApiFunction: lambda.Function;
  public readonly kbProcessorFunction: lambda.Function;
  public readonly createAgentFunction: lambda.Function;
  public readonly provisionNumberFunction: lambda.Function;
  public readonly linkNumberFunction: lambda.Function;
  public readonly updateDatabaseFunction: lambda.Function;

  constructor(scope: Construct, id: string, props: LambdaStackProps) {
    super(scope, id, props);

    // ========================================
    // Shared Lambda Layer (Node.js)
    // ========================================
    const sharedLayer = new lambda.LayerVersion(this, 'SharedLayer', {
      code: lambda.Code.fromAsset('../shared/nodejs'),
      compatibleRuntimes: [lambda.Runtime.NODEJS_20_X],
      description: 'Shared utilities for Node.js Lambda functions',
    });

    // ========================================
    // Lambda: Onboarding API
    // ========================================
    this.onboardingApiFunction = new lambda.Function(this, 'OnboardingApiFunction', {
      functionName: 'consultia-onboarding-api',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('../lambdas/onboarding-api/dist'),
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      layers: [sharedLayer],
      environment: {
        DB_SECRET_NAME: props.databaseSecret.secretName,
        KNOWLEDGE_BASE_BUCKET: props.knowledgeBaseBucket.bucketName,
        FRONTEND_URL: 'https://consultia.es',
        API_BASE_URL: 'https://api.consultia.es',
        AWS_REGION: this.region,
      },
    });

    // Grant permissions
    props.databaseSecret.grantRead(this.onboardingApiFunction);
    props.knowledgeBaseBucket.grantReadWrite(this.onboardingApiFunction);
    props.database.connections.allowDefaultPortFrom(this.onboardingApiFunction);

    // Integrate with API Gateway
    const onboardingResource = props.api.root.addResource('onboarding');
    onboardingResource.addMethod(
      'ANY',
      new apigateway.LambdaIntegration(this.onboardingApiFunction)
    );

    // ========================================
    // Lambda: Knowledge Base Processor (Python)
    // ========================================
    this.kbProcessorFunction = new lambda.Function(this, 'KBProcessorFunction', {
      functionName: 'consultia-kb-processor',
      runtime: lambda.Runtime.PYTHON_3_12,
      handler: 'lambda_function.lambda_handler',
      code: lambda.Code.fromAsset('../lambdas/knowledge-base-processor'),
      timeout: cdk.Duration.minutes(15), // 15 minutes for large PDFs
      memorySize: 3008, // 3 GB for PDF processing + Bedrock
      environment: {
        DB_SECRET_NAME: props.databaseSecret.secretName,
        KNOWLEDGE_BASE_BUCKET: props.knowledgeBaseBucket.bucketName,
        AWS_REGION: this.region,
      },
    });

    // Grant permissions
    props.databaseSecret.grantRead(this.kbProcessorFunction);
    props.knowledgeBaseBucket.grantRead(this.kbProcessorFunction);
    props.database.connections.allowDefaultPortFrom(this.kbProcessorFunction);

    // Grant Bedrock permissions
    this.kbProcessorFunction.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['bedrock:InvokeModel'],
        resources: [
          `arn:aws:bedrock:${this.region}::foundation-model/anthropic.claude-3-5-sonnet-20241022-v2:0`,
        ],
      })
    );

    // ========================================
    // Lambda: Agent Deployment (ElevenLabs + Twilio)
    // ========================================

    // Create Agent
    this.createAgentFunction = new lambda.Function(this, 'CreateAgentFunction', {
      functionName: 'consultia-create-agent',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('../lambdas/agent-deployment/dist'),
      timeout: cdk.Duration.seconds(60),
      memorySize: 512,
      layers: [sharedLayer],
      environment: {
        DB_SECRET_NAME: props.databaseSecret.secretName,
        ACTION: 'create-agent',
      },
    });

    // Provision Number
    this.provisionNumberFunction = new lambda.Function(this, 'ProvisionNumberFunction', {
      functionName: 'consultia-provision-number',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('../lambdas/agent-deployment/dist'),
      timeout: cdk.Duration.seconds(60),
      memorySize: 512,
      layers: [sharedLayer],
      environment: {
        DB_SECRET_NAME: props.databaseSecret.secretName,
        ACTION: 'provision-number',
        API_BASE_URL: 'https://api.consultia.es',
      },
    });

    // Link Number
    this.linkNumberFunction = new lambda.Function(this, 'LinkNumberFunction', {
      functionName: 'consultia-link-number',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('../lambdas/agent-deployment/dist'),
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      layers: [sharedLayer],
      environment: {
        DB_SECRET_NAME: props.databaseSecret.secretName,
        ACTION: 'link-number',
      },
    });

    // Update Database
    this.updateDatabaseFunction = new lambda.Function(this, 'UpdateDatabaseFunction', {
      functionName: 'consultia-update-database',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('../lambdas/agent-deployment/dist'),
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      layers: [sharedLayer],
      environment: {
        DB_SECRET_NAME: props.databaseSecret.secretName,
        ACTION: 'update-database',
      },
    });

    // Grant permissions to all agent deployment functions
    const agentFunctions = [
      this.createAgentFunction,
      this.provisionNumberFunction,
      this.linkNumberFunction,
      this.updateDatabaseFunction,
    ];

    agentFunctions.forEach((fn) => {
      props.databaseSecret.grantRead(fn);
      props.database.connections.allowDefaultPortFrom(fn);
    });

    // ========================================
    // Outputs
    // ========================================
    new cdk.CfnOutput(this, 'OnboardingApiFunctionArn', {
      value: this.onboardingApiFunction.functionArn,
      description: 'Onboarding API Lambda Function ARN',
    });

    new cdk.CfnOutput(this, 'KBProcessorFunctionArn', {
      value: this.kbProcessorFunction.functionArn,
      description: 'Knowledge Base Processor Lambda Function ARN',
    });
  }
}
