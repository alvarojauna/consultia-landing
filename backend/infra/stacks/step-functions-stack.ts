import * as cdk from 'aws-cdk-lib';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as tasks from 'aws-cdk-lib/aws-stepfunctions-tasks';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';

interface StepFunctionsStackProps extends cdk.StackProps {
  createAgentFunction: lambda.Function;
  provisionNumberFunction: lambda.Function;
  linkNumberFunction: lambda.Function;
  updateDatabaseFunction: lambda.Function;
}

export class StepFunctionsStack extends cdk.Stack {
  public readonly stateMachine: sfn.StateMachine;

  constructor(scope: Construct, id: string, props: StepFunctionsStackProps) {
    super(scope, id, props);

    // ========================================
    // Step Functions Workflow: Deploy Agent
    // ========================================

    // Step 1: Create Agent in ElevenLabs
    const createAgentTask = new tasks.LambdaInvoke(this, 'CreateElevenLabsAgent', {
      lambdaFunction: props.createAgentFunction,
      payload: sfn.TaskInput.fromObject({
        action: 'create-agent',
        'customer_id.$': '$.customer_id',
        'agent_id.$': '$.agent_id',
        'voice_id.$': '$.voice_id',
        'voice_name.$': '$.voice_name',
        'business.$': '$.business',
        'knowledge_base.$': '$.knowledge_base',
        'request_id.$': '$.request_id',
      }),
      outputPath: '$.Payload',
      retryOnServiceExceptions: true,
    });

    // Add retries for transient errors
    createAgentTask.addRetry({
      errors: ['States.TaskFailed', 'States.Timeout'],
      interval: cdk.Duration.seconds(2),
      maxAttempts: 3,
      backoffRate: 2,
    });

    // Step 2: Provision Phone Number from Twilio
    const provisionNumberTask = new tasks.LambdaInvoke(this, 'ProvisionTwilioNumber', {
      lambdaFunction: props.provisionNumberFunction,
      payload: sfn.TaskInput.fromObject({
        action: 'provision-number',
        'customer_id.$': '$.customer_id',
        'agent_id.$': '$.agent_id',
        'elevenlabs_agent_id.$': '$.elevenlabs_agent_id',
        'webhook_url.$': '$.webhook_url',
      }),
      outputPath: '$.Payload',
      retryOnServiceExceptions: true,
    });

    provisionNumberTask.addRetry({
      errors: ['States.TaskFailed', 'States.Timeout'],
      interval: cdk.Duration.seconds(2),
      maxAttempts: 3,
      backoffRate: 2,
    });

    // Step 3: Link Number to Agent
    const linkNumberTask = new tasks.LambdaInvoke(this, 'LinkNumberToAgent', {
      lambdaFunction: props.linkNumberFunction,
      payload: sfn.TaskInput.fromObject({
        action: 'link-number',
        'customer_id.$': '$.customer_id',
        'agent_id.$': '$.agent_id',
        'phone_number.$': '$.phone_number',
        'phone_id.$': '$.phone_id',
        'elevenlabs_agent_id.$': '$.elevenlabs_agent_id', // Pass through for UpdateDatabase
      }),
      outputPath: '$.Payload',
      retryOnServiceExceptions: true,
    });

    // Step 4: Update Database (Mark as Active)
    const updateDatabaseTask = new tasks.LambdaInvoke(this, 'UpdateDatabase', {
      lambdaFunction: props.updateDatabaseFunction,
      payload: sfn.TaskInput.fromObject({
        action: 'update-database',
        'customer_id.$': '$.customer_id',
        'agent_id.$': '$.agent_id',
        'elevenlabs_agent_id.$': '$.elevenlabs_agent_id',
        'phone_number.$': '$.phone_number',
      }),
      outputPath: '$.Payload',
    });

    // Success state
    const successState = new sfn.Succeed(this, 'DeploymentSucceeded', {
      comment: 'Agent deployed successfully',
    });

    // Failure state
    const failureState = new sfn.Fail(this, 'DeploymentFailed', {
      comment: 'Agent deployment failed',
      error: 'DeploymentError',
      cause: 'One or more steps in the deployment workflow failed',
    });

    // Define workflow
    const definition = createAgentTask
      .next(provisionNumberTask)
      .next(linkNumberTask)
      .next(updateDatabaseTask)
      .next(successState);

    // Catch errors and go to failure state
    createAgentTask.addCatch(failureState, {
      errors: ['States.ALL'],
      resultPath: '$.error',
    });

    provisionNumberTask.addCatch(failureState, {
      errors: ['States.ALL'],
      resultPath: '$.error',
    });

    linkNumberTask.addCatch(failureState, {
      errors: ['States.ALL'],
      resultPath: '$.error',
    });

    updateDatabaseTask.addCatch(failureState, {
      errors: ['States.ALL'],
      resultPath: '$.error',
    });

    // Create State Machine
    this.stateMachine = new sfn.StateMachine(this, 'DeployAgentStateMachine', {
      stateMachineName: 'consultia-deploy-agent',
      definition,
      timeout: cdk.Duration.minutes(5),
      tracingEnabled: true,
      logs: {
        destination: new cdk.aws_logs.LogGroup(this, 'DeployAgentLogGroup', {
          logGroupName: '/aws/stepfunctions/consultia-deploy-agent',
          retention: cdk.aws_logs.RetentionDays.ONE_WEEK,
        }),
        level: sfn.LogLevel.ALL,
      },
    });

    // ========================================
    // Outputs
    // ========================================
    new cdk.CfnOutput(this, 'DeployAgentStateMachineArn', {
      value: this.stateMachine.stateMachineArn,
      description: 'Deploy Agent Step Functions State Machine ARN',
      exportName: 'ConsultIA-DeployAgentStateMachineArn',
    });
  }
}
