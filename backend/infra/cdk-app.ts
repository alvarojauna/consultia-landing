#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { DatabaseStack } from './stacks/database-stack';
import { StorageStack } from './stacks/storage-stack';
import { ApiStack } from './stacks/api-stack';
import { LambdaStack } from './stacks/lambda-stack';
import { StepFunctionsStack } from './stacks/step-functions-stack';

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

// 3. API Stack (API Gateway + Cognito)
const apiStack = new ApiStack(app, `${stackPrefix}-Api`, {
  env,
  description: 'API Gateway REST + WebSocket APIs with Cognito auth',
});

// 4. Lambda Stack (All Lambda functions)
const lambdaStack = new LambdaStack(app, `${stackPrefix}-Lambda`, {
  env,
  description: 'Lambda functions for onboarding, processing, webhooks',
  database: databaseStack.database,
  databaseSecret: databaseStack.databaseSecret,
  knowledgeBaseBucket: storageStack.knowledgeBaseBucket,
  recordingsBucket: storageStack.recordingsBucket,
  callLogsTable: databaseStack.callLogsTable,
  agentSessionsTable: databaseStack.agentSessionsTable,
  api: apiStack.api,
  userPool: apiStack.userPool,
});

// 5. Step Functions Stack (Agent deployment workflow)
const stepFunctionsStack = new StepFunctionsStack(app, `${stackPrefix}-StepFunctions`, {
  env,
  description: 'Step Functions workflow for agent deployment',
  createAgentFunction: lambdaStack.createAgentFunction,
  provisionNumberFunction: lambdaStack.provisionNumberFunction,
  linkNumberFunction: lambdaStack.linkNumberFunction,
  updateDatabaseFunction: lambdaStack.updateDatabaseFunction,
});

// Add dependencies
lambdaStack.addDependency(databaseStack);
lambdaStack.addDependency(storageStack);
lambdaStack.addDependency(apiStack);
stepFunctionsStack.addDependency(lambdaStack);

// Tags for all resources
cdk.Tags.of(app).add('Project', 'ConsultIA');
cdk.Tags.of(app).add('Environment', process.env.ENV || 'development');
cdk.Tags.of(app).add('ManagedBy', 'CDK');

app.synth();
