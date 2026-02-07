#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { DatabaseStack } from './stacks/database-stack';
import { StorageStack } from './stacks/storage-stack';
import { ApiLambdaStack } from './stacks/api-lambda-stack';
import { StepFunctionsStack } from './stacks/step-functions-stack';
import { MonitoringStack } from './stacks/monitoring-stack';

const app = new cdk.App();

// Environment configuration
const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION || 'eu-west-1',
};

// Stack naming prefix
const stackPrefix = 'ConsultIA';

// 1. Database Stack (Aurora PostgreSQL + DynamoDB)
const databaseStack = new DatabaseStack(app, `${stackPrefix}-Database`, {
  env,
  description: 'Aurora Serverless PostgreSQL + DynamoDB tables',
});

// 2. Storage Stack (S3 buckets for knowledge bases and recordings)
const storageStack = new StorageStack(app, `${stackPrefix}-Storage`, {
  env,
  description: 'S3 buckets for knowledge bases, recordings, and assets',
});

// 3. API + Lambda Stack (combined to avoid circular dependencies)
const apiLambdaStack = new ApiLambdaStack(app, `${stackPrefix}-ApiLambda`, {
  env,
  description: 'API Gateway, Cognito, and all Lambda functions',
  vpc: databaseStack.vpc,
  database: databaseStack.database,
  databaseSecret: databaseStack.databaseSecret,
  lambdaSecurityGroup: databaseStack.lambdaSecurityGroup,
  knowledgeBaseBucket: storageStack.knowledgeBaseBucket,
  recordingsBucket: storageStack.recordingsBucket,
  callLogsTable: databaseStack.callLogsTable,
  agentSessionsTable: databaseStack.agentSessionsTable,
});

// 4. Step Functions Stack (Agent deployment workflow)
const stepFunctionsStack = new StepFunctionsStack(app, `${stackPrefix}-StepFunctions`, {
  env,
  description: 'Step Functions workflow for agent deployment',
  createAgentFunction: apiLambdaStack.createAgentFunction,
  provisionNumberFunction: apiLambdaStack.provisionNumberFunction,
  linkNumberFunction: apiLambdaStack.linkNumberFunction,
  updateDatabaseFunction: apiLambdaStack.updateDatabaseFunction,
});

// 5. Monitoring Stack (CloudWatch Alarms + Dashboard)
const monitoringStack = new MonitoringStack(app, `${stackPrefix}-Monitoring`, {
  env,
  description: 'CloudWatch alarms, dashboard, and SNS notifications',
  api: apiLambdaStack.api,
  database: databaseStack.database,
  stateMachine: stepFunctionsStack.stateMachine,
  lambdaFunctions: [
    apiLambdaStack.onboardingApiFunction,
    apiLambdaStack.dashboardApiFunction,
    apiLambdaStack.webhookApiFunction,
    apiLambdaStack.kbProcessorFunction,
    apiLambdaStack.createAgentFunction,
    apiLambdaStack.provisionNumberFunction,
    apiLambdaStack.linkNumberFunction,
    apiLambdaStack.updateDatabaseFunction,
  ],
});

// Add dependencies
apiLambdaStack.addDependency(databaseStack);
apiLambdaStack.addDependency(storageStack);
stepFunctionsStack.addDependency(apiLambdaStack);
monitoringStack.addDependency(apiLambdaStack);
monitoringStack.addDependency(stepFunctionsStack);
monitoringStack.addDependency(databaseStack);

// Tags for all resources
cdk.Tags.of(app).add('Project', 'ConsultIA');
cdk.Tags.of(app).add('Environment', process.env.ENV || 'development');
cdk.Tags.of(app).add('ManagedBy', 'CDK');

app.synth();
