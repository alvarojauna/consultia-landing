import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import { Construct } from 'constructs';

interface ApiLambdaStackProps extends cdk.StackProps {
  vpc: ec2.Vpc;
  database: rds.DatabaseCluster;
  databaseSecret: secretsmanager.ISecret;
  lambdaSecurityGroup: ec2.SecurityGroup;
  knowledgeBaseBucket: s3.Bucket;
  recordingsBucket: s3.Bucket;
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
        FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3001',
        DEPLOY_REGION: this.region,
        API_KEYS_SECRET_NAME: 'consultia/production/api-keys',
        DEPLOY_AGENT_STATE_MACHINE_ARN: `arn:aws:states:${this.region}:${this.account}:stateMachine:consultia-deploy-agent`,
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
        resources: [`arn:aws:states:${this.region}:${this.account}:stateMachine:consultia-deploy-agent`],
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
        FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3001',
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
      },
    });

    props.databaseSecret.grantRead(this.webhookApiFunction);

    // API Gateway routes — Webhooks
    const webhooksResource = this.api.root.addResource('webhooks');
    webhooksResource.addProxy({
      defaultIntegration: new apigateway.LambdaIntegration(this.webhookApiFunction),
      anyMethod: true,
    });

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
        resources: [`arn:aws:bedrock:${this.region}::foundation-model/anthropic.claude-3-5-sonnet-20241022-v2:0`],
      })
    );

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
      environment: { DB_SECRET_NAME: props.databaseSecret.secretName, API_KEYS_SECRET_NAME: 'consultia/production/api-keys', ACTION: 'provision-number' },
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
