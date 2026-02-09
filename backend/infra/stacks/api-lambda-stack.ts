import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import { SqsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import { Construct } from 'constructs';

interface ApiLambdaStackProps extends cdk.StackProps {
  vpc: ec2.Vpc;
  database: rds.DatabaseCluster;
  databaseSecret: secretsmanager.ISecret;
  lambdaSecurityGroup: ec2.SecurityGroup;
  knowledgeBaseBucket: s3.IBucket;
  recordingsBucket: s3.IBucket;
  callLogsTable: dynamodb.Table;
  agentSessionsTable: dynamodb.Table;
}

export class ApiLambdaStack extends cdk.Stack {
  public readonly api: apigateway.RestApi;
  public readonly userPool: cognito.UserPool;
  public readonly onboardingApiFunction: lambda.Function;
  public readonly dashboardApiFunction: lambda.Function;
  public readonly webhookApiFunction: lambda.Function;
  public readonly kbProcessorFunction: lambda.Function;
  public readonly createAgentFunction: lambda.Function;
  public readonly provisionNumberFunction: lambda.Function;
  public readonly linkNumberFunction: lambda.Function;
  public readonly updateDatabaseFunction: lambda.Function;

  constructor(scope: Construct, id: string, props: ApiLambdaStackProps) {
    super(scope, id, props);

    // ========================================
    // Cognito User Pool
    // ========================================
    this.userPool = new cognito.UserPool(this, 'UserPool', {
      userPoolName: 'consultia-customers',
      selfSignUpEnabled: true,
      signInAliases: { email: true },
      autoVerify: { email: true },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: false,
      },
      standardAttributes: {
        email: { required: true, mutable: false },
        phoneNumber: { required: false, mutable: true },
      },
      customAttributes: {
        business_name: new cognito.StringAttribute({ mutable: true }),
        customer_id: new cognito.StringAttribute({ mutable: false }),
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
    });

    const userPoolClient = this.userPool.addClient('FrontendClient', {
      userPoolClientName: 'consultia-frontend',
      authFlows: { userPassword: true, userSrp: true },
      oAuth: {
        flows: { authorizationCodeGrant: true },
        scopes: [cognito.OAuthScope.EMAIL, cognito.OAuthScope.OPENID, cognito.OAuthScope.PROFILE],
      },
      preventUserExistenceErrors: true,
    });

    // ========================================
    // API Gateway
    // ========================================
    this.api = new apigateway.RestApi(this, 'API', {
      restApiName: 'consultia-api',
      description: 'ConsultIA Backend API',
      deployOptions: {
        stageName: 'prod',
        throttlingBurstLimit: 2000,
        throttlingRateLimit: 1000,
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
        dataTraceEnabled: false,
        metricsEnabled: true,
      },
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Api-Key'],
        allowCredentials: false,
      },
    });

    const cognitoAuthorizer = new apigateway.CognitoUserPoolsAuthorizer(this, 'CognitoAuth', {
      cognitoUserPools: [this.userPool],
    });

    // ========================================
    // Shared Lambda Config
    // ========================================
    const sharedLayer = new lambda.LayerVersion(this, 'SharedLayer', {
      code: lambda.Code.fromAsset('../shared/layer-build'),
      compatibleRuntimes: [lambda.Runtime.NODEJS_20_X],
      description: 'Shared utilities for Node.js Lambda functions',
    });

    const vpcSubnets = { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS };
    const securityGroups = [props.lambdaSecurityGroup];

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
      vpc: props.vpc, vpcSubnets, securityGroups,
      layers: [sharedLayer],
      environment: {
        DB_SECRET_NAME: props.databaseSecret.secretName,
        KNOWLEDGE_BASE_BUCKET: props.knowledgeBaseBucket.bucketName,
        FRONTEND_URL: 'https://master.d3y5kfh3d0f62.amplifyapp.com',
        DEPLOY_REGION: this.region,
        API_KEYS_SECRET_NAME: 'consultia/production/api-keys',
        DEPLOY_AGENT_STATE_MACHINE_ARN: `arn:aws:states:${this.region}:${this.account}:stateMachine:consultia-create-agent`,
        API_BASE_URL: `https://${this.api.restApiId}.execute-api.${this.region}.amazonaws.com/prod`,
      },
    });

    props.databaseSecret.grantRead(this.onboardingApiFunction);
    props.knowledgeBaseBucket.grantReadWrite(this.onboardingApiFunction);

    // Grant access to API keys secret (ElevenLabs, Stripe, Twilio)
    const apiKeysSecret = secretsmanager.Secret.fromSecretNameV2(this, 'ApiKeysSecret', 'consultia/production/api-keys');
    apiKeysSecret.grantRead(this.onboardingApiFunction);

    // Grant permission to start Step Functions executions
    this.onboardingApiFunction.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['states:StartExecution'],
        resources: [`arn:aws:states:${this.region}:${this.account}:stateMachine:consultia-create-agent`],
      })
    );

    // API Gateway routes — Onboarding
    const onboardingResource = this.api.root.addResource('onboarding');
    const onboardingIntegration = new apigateway.LambdaIntegration(this.onboardingApiFunction);
    onboardingResource.addResource('business-info').addMethod('POST', onboardingIntegration);
    const onboardingCustomer = onboardingResource.addResource('{customerId}');
    onboardingCustomer.addProxy({ defaultIntegration: onboardingIntegration, anyMethod: true });
    this.api.root.addResource('voices').addMethod('GET', onboardingIntegration);
    this.api.root.addResource('plans').addMethod('GET', onboardingIntegration);

    // ========================================
    // Lambda: Dashboard API
    // ========================================
    this.dashboardApiFunction = new lambda.Function(this, 'DashboardApiFunction', {
      functionName: 'consultia-dashboard-api',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('../lambdas/dashboard-api/dist'),
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      vpc: props.vpc, vpcSubnets, securityGroups,
      layers: [sharedLayer],
      environment: {
        DB_SECRET_NAME: props.databaseSecret.secretName,
        FRONTEND_URL: 'https://master.d3y5kfh3d0f62.amplifyapp.com',
        API_KEYS_SECRET_NAME: 'consultia/production/api-keys',
      },
    });

    props.databaseSecret.grantRead(this.dashboardApiFunction);

    // API Gateway routes — Dashboard (requires Cognito auth)
    const dashboardResource = this.api.root.addResource('dashboard');
    const dashboardCustomer = dashboardResource.addResource('{customerId}');
    dashboardCustomer.addProxy({
      defaultIntegration: new apigateway.LambdaIntegration(this.dashboardApiFunction),
      anyMethod: true,
      defaultMethodOptions: {
        authorizer: cognitoAuthorizer,
        authorizationType: apigateway.AuthorizationType.COGNITO,
      },
    });

    // ========================================
    // Lambda: Webhooks (Stripe + Twilio — NO auth)
    // ========================================
    this.webhookApiFunction = new lambda.Function(this, 'WebhookApiFunction', {
      functionName: 'consultia-webhook-api',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('../lambdas/webhook-api/dist'),
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      vpc: props.vpc, vpcSubnets, securityGroups,
      layers: [sharedLayer],
      environment: {
        DB_SECRET_NAME: props.databaseSecret.secretName,
        API_KEYS_SECRET_NAME: 'consultia/production/api-keys',
        API_BASE_URL: `https://${this.api.restApiId}.execute-api.${this.region}.amazonaws.com/prod`,
        PROVISION_NUMBER_STATE_MACHINE_ARN: `arn:aws:states:${this.region}:${this.account}:stateMachine:consultia-provision-number`,
      },
    });

    props.databaseSecret.grantRead(this.webhookApiFunction);
    apiKeysSecret.grantRead(this.webhookApiFunction);

    // Grant webhook-api permission to trigger number provisioning after payment
    this.webhookApiFunction.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['states:StartExecution'],
        resources: [`arn:aws:states:${this.region}:${this.account}:stateMachine:consultia-provision-number`],
      })
    );

    // API Gateway routes — Webhooks
    const webhooksResource = this.api.root.addResource('webhooks');
    webhooksResource.addProxy({
      defaultIntegration: new apigateway.LambdaIntegration(this.webhookApiFunction),
      anyMethod: true,
    });

    // ========================================
    // SQS: Business Scraping Queue
    // ========================================
    const scrapingDlq = new sqs.Queue(this, 'ScrapingDLQ', {
      queueName: 'consultia-scraping-dlq',
      retentionPeriod: cdk.Duration.days(14),
    });

    const scrapingQueue = new sqs.Queue(this, 'ScrapingQueue', {
      queueName: 'consultia-scraping',
      visibilityTimeout: cdk.Duration.seconds(90), // matches scraper Lambda timeout
      retentionPeriod: cdk.Duration.days(4),
      deadLetterQueue: {
        queue: scrapingDlq,
        maxReceiveCount: 3,
      },
    });

    // Give onboarding Lambda permission to send scraping jobs
    scrapingQueue.grantSendMessages(this.onboardingApiFunction);
    this.onboardingApiFunction.addEnvironment('SCRAPING_QUEUE_URL', scrapingQueue.queueUrl);

    // ========================================
    // Lambda: Business Scraper (Python)
    // ========================================
    const businessScraperFunction = new lambda.Function(this, 'BusinessScraperFunction', {
      functionName: 'consultia-business-scraper',
      runtime: lambda.Runtime.PYTHON_3_12,
      handler: 'lambda_function.lambda_handler',
      code: lambda.Code.fromAsset('../lambdas/business-scraper'),
      timeout: cdk.Duration.seconds(60),
      memorySize: 512,
      vpc: props.vpc, vpcSubnets, securityGroups,
      environment: {
        DB_SECRET_NAME: props.databaseSecret.secretName,
        DEPLOY_REGION: this.region,
      },
    });

    props.databaseSecret.grantRead(businessScraperFunction);
    businessScraperFunction.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['bedrock:InvokeModel'],
        resources: [
          `arn:aws:bedrock:*::foundation-model/anthropic.claude-*`,
          `arn:aws:bedrock:${this.region}:${this.account}:inference-profile/eu.anthropic.*`,
        ],
      })
    );

    // Wire SQS → Business Scraper Lambda
    businessScraperFunction.addEventSource(
      new SqsEventSource(scrapingQueue, { batchSize: 1 })
    );

    // ========================================
    // Lambda: Knowledge Base Processor (Python)
    // ========================================
    this.kbProcessorFunction = new lambda.Function(this, 'KBProcessorFunction', {
      functionName: 'consultia-kb-processor',
      runtime: lambda.Runtime.PYTHON_3_12,
      handler: 'lambda_function.lambda_handler',
      code: lambda.Code.fromAsset('../lambdas/knowledge-base-processor'),
      timeout: cdk.Duration.minutes(15),
      memorySize: 3008,
      vpc: props.vpc, vpcSubnets, securityGroups,
      environment: {
        DB_SECRET_NAME: props.databaseSecret.secretName,
        KNOWLEDGE_BASE_BUCKET: props.knowledgeBaseBucket.bucketName,
        DEPLOY_REGION: this.region,
      },
    });

    props.databaseSecret.grantRead(this.kbProcessorFunction);
    props.knowledgeBaseBucket.grantRead(this.kbProcessorFunction);
    this.kbProcessorFunction.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['bedrock:InvokeModel'],
        resources: [
          `arn:aws:bedrock:*::foundation-model/anthropic.claude-*`,
          `arn:aws:bedrock:${this.region}:${this.account}:inference-profile/eu.anthropic.*`,
        ],
      })
    );

    // ========================================
    // SQS: KB Processing Queue
    // ========================================
    const kbProcessingDlq = new sqs.Queue(this, 'KBProcessingDLQ', {
      queueName: 'consultia-kb-processing-dlq',
      retentionPeriod: cdk.Duration.days(14),
    });

    const kbProcessingQueue = new sqs.Queue(this, 'KBProcessingQueue', {
      queueName: 'consultia-kb-processing',
      visibilityTimeout: cdk.Duration.minutes(15), // matches KB Processor Lambda timeout
      retentionPeriod: cdk.Duration.days(4),
      deadLetterQueue: {
        queue: kbProcessingDlq,
        maxReceiveCount: 3,
      },
    });

    // Wire SQS → KB Processor Lambda
    this.kbProcessorFunction.addEventSource(
      new SqsEventSource(kbProcessingQueue, { batchSize: 1 })
    );

    // Give onboarding Lambda permission to send messages + the queue URL
    kbProcessingQueue.grantSendMessages(this.onboardingApiFunction);
    this.onboardingApiFunction.addEnvironment('KB_PROCESSING_QUEUE_URL', kbProcessingQueue.queueUrl);

    // ========================================
    // Lambda: Agent Deployment (4 Step Functions tasks)
    // ========================================
    this.createAgentFunction = new lambda.Function(this, 'CreateAgentFunction', {
      functionName: 'consultia-create-agent',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('../lambdas/agent-deployment/dist'),
      timeout: cdk.Duration.seconds(60),
      memorySize: 512,
      vpc: props.vpc, vpcSubnets, securityGroups,
      layers: [sharedLayer],
      environment: { DB_SECRET_NAME: props.databaseSecret.secretName, API_KEYS_SECRET_NAME: 'consultia/production/api-keys', ACTION: 'create-agent' },
    });

    this.provisionNumberFunction = new lambda.Function(this, 'ProvisionNumberFunction', {
      functionName: 'consultia-provision-number',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('../lambdas/agent-deployment/dist'),
      timeout: cdk.Duration.seconds(60),
      memorySize: 512,
      vpc: props.vpc, vpcSubnets, securityGroups,
      layers: [sharedLayer],
      environment: { DB_SECRET_NAME: props.databaseSecret.secretName, API_KEYS_SECRET_NAME: 'consultia/production/api-keys', ACTION: 'provision-number', API_BASE_URL: `https://${this.api.restApiId}.execute-api.${this.region}.amazonaws.com/prod` },
    });

    this.linkNumberFunction = new lambda.Function(this, 'LinkNumberFunction', {
      functionName: 'consultia-link-number',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('../lambdas/agent-deployment/dist'),
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      vpc: props.vpc, vpcSubnets, securityGroups,
      layers: [sharedLayer],
      environment: { DB_SECRET_NAME: props.databaseSecret.secretName, API_KEYS_SECRET_NAME: 'consultia/production/api-keys', ACTION: 'link-number' },
    });

    this.updateDatabaseFunction = new lambda.Function(this, 'UpdateDatabaseFunction', {
      functionName: 'consultia-update-database',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('../lambdas/agent-deployment/dist'),
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      vpc: props.vpc, vpcSubnets, securityGroups,
      layers: [sharedLayer],
      environment: { DB_SECRET_NAME: props.databaseSecret.secretName, ACTION: 'update-database' },
    });

    // Grant DB secret + API keys read to all agent functions
    [this.createAgentFunction, this.provisionNumberFunction, this.linkNumberFunction, this.updateDatabaseFunction]
      .forEach((fn) => {
        props.databaseSecret.grantRead(fn);
        apiKeysSecret.grantRead(fn);
      });

    // ========================================
    // Outputs
    // ========================================
    new cdk.CfnOutput(this, 'ApiGatewayUrl', {
      value: this.api.url,
      description: 'API Gateway URL',
      exportName: 'ConsultIA-ApiUrl',
    });

    new cdk.CfnOutput(this, 'UserPoolId', {
      value: this.userPool.userPoolId,
      description: 'Cognito User Pool ID',
      exportName: 'ConsultIA-UserPoolId',
    });

    new cdk.CfnOutput(this, 'UserPoolClientId', {
      value: userPoolClient.userPoolClientId,
      description: 'Cognito User Pool Client ID',
      exportName: 'ConsultIA-UserPoolClientId',
    });
  }
}
