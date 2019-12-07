import ddb = require('@aws-cdk/aws-dynamodb');
import sqs = require('@aws-cdk/aws-sqs');
import lambda = require('@aws-cdk/aws-lambda');
import cdk = require('@aws-cdk/core');
import path = require('path');
import sources = require('@aws-cdk/aws-lambda-event-sources');
import { Duration, CfnOutput } from '@aws-cdk/core';
import { BUILT_TABLE_ENVVAR, WORK_QUEUE_ENVVAR } from '../builder-lambda/identifiers';

export class StBuildStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const table = new ddb.Table(this, 'Table', {
      partitionKey: { name: 'module', type: ddb.AttributeType.STRING },
    });

    const timeout = Duration.minutes(10);

    const queue = new sqs.Queue(this, 'Queue', {
      visibilityTimeout: timeout,
    });

    const builder = new lambda.Function(this, 'Builder', {
      code: lambda.Code.fromAsset(path.join(__dirname, '..', 'builder-lambda')),
      handler: 'builder.handler',
      runtime: lambda.Runtime.NODEJS_12_X,
      timeout,
      environment: {
        [BUILT_TABLE_ENVVAR]: table.tableName,
        [WORK_QUEUE_ENVVAR]: queue.queueUrl,
      },

      events: [
        new sources.SqsEventSource(queue, { batchSize: 1 })
      ]
    });

    table.grantReadWriteData(builder);
    queue.grantConsumeMessages(builder);
    queue.grantSendMessages(builder);

    new CfnOutput(this, 'QueueUrl', {
      value: queue.queueUrl
    });
  }
}
