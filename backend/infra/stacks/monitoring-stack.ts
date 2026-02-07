import * as cdk from 'aws-cdk-lib';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as cloudwatch_actions from 'aws-cdk-lib/aws-cloudwatch-actions';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import { Construct } from 'constructs';

interface MonitoringStackProps extends cdk.StackProps {
  api: apigateway.RestApi;
  database: rds.DatabaseCluster;
  stateMachine: sfn.StateMachine;
  lambdaFunctions: lambda.Function[];
}

export class MonitoringStack extends cdk.Stack {
  public readonly alarmTopic: sns.Topic;

  constructor(scope: Construct, id: string, props: MonitoringStackProps) {
    super(scope, id, props);

    // ========================================
    // SNS Topic for Alarm Notifications
    // ========================================
    this.alarmTopic = new sns.Topic(this, 'AlarmTopic', {
      topicName: 'consultia-alarms',
      displayName: 'ConsultIA Production Alarms',
    });

    // ========================================
    // Lambda Error Alarms (one per function)
    // ========================================
    props.lambdaFunctions.forEach((fn) => {
      const safeName = fn.functionName.replace(/[^a-zA-Z0-9-]/g, '-');
      const alarm = new cloudwatch.Alarm(this, `${safeName}-ErrorAlarm`, {
        alarmName: `consultia-${fn.functionName}-errors`,
        alarmDescription: `Lambda errors for ${fn.functionName}`,
        metric: fn.metricErrors({
          period: cdk.Duration.minutes(5),
          statistic: 'Sum',
        }),
        threshold: 5,
        evaluationPeriods: 2,
        comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      });

      alarm.addAlarmAction(new cloudwatch_actions.SnsAction(this.alarmTopic));
    });

    // ========================================
    // API Gateway 5xx Error Alarm
    // ========================================
    const api5xxAlarm = new cloudwatch.Alarm(this, 'Api5xxAlarm', {
      alarmName: 'consultia-api-5xx-errors',
      alarmDescription: 'API Gateway 5xx errors exceeding threshold',
      metric: props.api.metricServerError({
        period: cdk.Duration.minutes(5),
        statistic: 'Sum',
      }),
      threshold: 10,
      evaluationPeriods: 2,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    api5xxAlarm.addAlarmAction(new cloudwatch_actions.SnsAction(this.alarmTopic));

    // API Gateway 4xx Error Alarm (high threshold — client errors spike)
    const api4xxAlarm = new cloudwatch.Alarm(this, 'Api4xxAlarm', {
      alarmName: 'consultia-api-4xx-errors',
      alarmDescription: 'API Gateway 4xx errors spike (possible abuse)',
      metric: props.api.metricClientError({
        period: cdk.Duration.minutes(5),
        statistic: 'Sum',
      }),
      threshold: 100,
      evaluationPeriods: 3,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    api4xxAlarm.addAlarmAction(new cloudwatch_actions.SnsAction(this.alarmTopic));

    // API Gateway Latency Alarm (p99 > 5s)
    const apiLatencyAlarm = new cloudwatch.Alarm(this, 'ApiLatencyAlarm', {
      alarmName: 'consultia-api-high-latency',
      alarmDescription: 'API Gateway p99 latency exceeding 5 seconds',
      metric: props.api.metricLatency({
        period: cdk.Duration.minutes(5),
        statistic: 'p99',
      }),
      threshold: 5000, // 5 seconds in ms
      evaluationPeriods: 3,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    apiLatencyAlarm.addAlarmAction(new cloudwatch_actions.SnsAction(this.alarmTopic));

    // ========================================
    // Aurora PostgreSQL Alarms
    // ========================================
    const dbCpuAlarm = new cloudwatch.Alarm(this, 'DatabaseCpuAlarm', {
      alarmName: 'consultia-aurora-high-cpu',
      alarmDescription: 'Aurora PostgreSQL CPU utilization exceeding 80%',
      metric: new cloudwatch.Metric({
        namespace: 'AWS/RDS',
        metricName: 'CPUUtilization',
        dimensionsMap: {
          DBClusterIdentifier: props.database.clusterIdentifier,
        },
        period: cdk.Duration.minutes(5),
        statistic: 'Average',
      }),
      threshold: 80,
      evaluationPeriods: 3,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    dbCpuAlarm.addAlarmAction(new cloudwatch_actions.SnsAction(this.alarmTopic));

    const dbConnectionsAlarm = new cloudwatch.Alarm(this, 'DatabaseConnectionsAlarm', {
      alarmName: 'consultia-aurora-high-connections',
      alarmDescription: 'Aurora PostgreSQL connections exceeding 80% capacity',
      metric: new cloudwatch.Metric({
        namespace: 'AWS/RDS',
        metricName: 'DatabaseConnections',
        dimensionsMap: {
          DBClusterIdentifier: props.database.clusterIdentifier,
        },
        period: cdk.Duration.minutes(5),
        statistic: 'Average',
      }),
      threshold: 80, // Aurora Serverless v2 max varies by ACU, 80 is a safe alert
      evaluationPeriods: 2,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    dbConnectionsAlarm.addAlarmAction(new cloudwatch_actions.SnsAction(this.alarmTopic));

    // ========================================
    // Step Functions Alarms
    // ========================================
    const sfnFailedAlarm = new cloudwatch.Alarm(this, 'StepFunctionsFailedAlarm', {
      alarmName: 'consultia-deploy-agent-failures',
      alarmDescription: 'Agent deployment workflow failures',
      metric: props.stateMachine.metricFailed({
        period: cdk.Duration.minutes(15),
        statistic: 'Sum',
      }),
      threshold: 3,
      evaluationPeriods: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    sfnFailedAlarm.addAlarmAction(new cloudwatch_actions.SnsAction(this.alarmTopic));

    // ========================================
    // CloudWatch Dashboard
    // ========================================
    const dashboard = new cloudwatch.Dashboard(this, 'ConsultIA-Dashboard', {
      dashboardName: 'ConsultIA-Production',
    });

    // API Gateway row
    dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'API Gateway Requests',
        left: [
          props.api.metricCount({ period: cdk.Duration.minutes(5) }),
        ],
        width: 8,
      }),
      new cloudwatch.GraphWidget({
        title: 'API Gateway Errors',
        left: [
          props.api.metricServerError({ period: cdk.Duration.minutes(5) }),
          props.api.metricClientError({ period: cdk.Duration.minutes(5) }),
        ],
        width: 8,
      }),
      new cloudwatch.GraphWidget({
        title: 'API Gateway Latency',
        left: [
          props.api.metricLatency({ period: cdk.Duration.minutes(5), statistic: 'p50' }),
          props.api.metricLatency({ period: cdk.Duration.minutes(5), statistic: 'p99' }),
        ],
        width: 8,
      }),
    );

    // Lambda row
    dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'Lambda Errors (All Functions)',
        left: props.lambdaFunctions.map((fn) =>
          fn.metricErrors({ period: cdk.Duration.minutes(5) })
        ),
        width: 12,
      }),
      new cloudwatch.GraphWidget({
        title: 'Lambda Duration (All Functions)',
        left: props.lambdaFunctions.map((fn) =>
          fn.metricDuration({ period: cdk.Duration.minutes(5), statistic: 'p99' })
        ),
        width: 12,
      }),
    );

    // Database row
    dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'Aurora CPU Utilization',
        left: [
          new cloudwatch.Metric({
            namespace: 'AWS/RDS',
            metricName: 'CPUUtilization',
            dimensionsMap: { DBClusterIdentifier: props.database.clusterIdentifier },
            period: cdk.Duration.minutes(5),
            statistic: 'Average',
          }),
        ],
        width: 8,
      }),
      new cloudwatch.GraphWidget({
        title: 'Aurora Connections',
        left: [
          new cloudwatch.Metric({
            namespace: 'AWS/RDS',
            metricName: 'DatabaseConnections',
            dimensionsMap: { DBClusterIdentifier: props.database.clusterIdentifier },
            period: cdk.Duration.minutes(5),
            statistic: 'Average',
          }),
        ],
        width: 8,
      }),
      new cloudwatch.GraphWidget({
        title: 'Step Functions Executions',
        left: [
          props.stateMachine.metricSucceeded({ period: cdk.Duration.minutes(15) }),
          props.stateMachine.metricFailed({ period: cdk.Duration.minutes(15) }),
        ],
        width: 8,
      }),
    );

    // ========================================
    // Outputs
    // ========================================
    new cdk.CfnOutput(this, 'AlarmTopicArn', {
      value: this.alarmTopic.topicArn,
      description: 'SNS topic ARN for alarm notifications',
      exportName: 'ConsultIA-AlarmTopicArn',
    });

    new cdk.CfnOutput(this, 'DashboardUrl', {
      value: cdk.Fn.sub(
        'https://${AWS::Region}.console.aws.amazon.com/cloudwatch/home?region=${AWS::Region}#dashboards:name=ConsultIA-Production'
      ),
      description: 'CloudWatch Dashboard URL',
      exportName: 'ConsultIA-DashboardUrl',
    });
  }
}
