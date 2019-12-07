import AWS = require('aws-sdk');
import { BUILT_TABLE_ENVVAR, TABLE_MODULE_KEY, SATISFIED_DEPS_KEY, WORK_QUEUE_ENVVAR } from './identifiers';
import { consumers, dependencies, packagesWithoutDependencies, buildTime } from './deps';

const ddb = new AWS.DynamoDB();
const sqs = new AWS.SQS();

export interface BuildCommand {
  buildIdentifier: string;
  package?: string;
}

export async function handler(event: AWSLambda.SQSEvent, context: AWSLambda.Context) {
  for (const record of event.Records) {
    const recordBody = JSON.parse(record.body) as BuildCommand;
    if (!recordBody.buildIdentifier) {
      recordBody.buildIdentifier = context.awsRequestId;
    }

    const readyPackages = new Array<string>();
    if (recordBody.package) {
      readyPackages.push(...await build(recordBody));
    } else {
      // No package to build. This should only be possible on the very first
      // message. Enqueue all
      readyPackages.push(...packagesWithoutDependencies());
    }

    for (const ready of readyPackages) {
      await sqs.sendMessage({
        QueueUrl: process.env[WORK_QUEUE_ENVVAR]!,
        MessageBody: JSON.stringify({
          buildIdentifier: recordBody.buildIdentifier,
          package: ready
        } as BuildCommand)
      }).promise();
    }
  }
}

async function build(buildCommand: BuildCommand) {
  if (!buildCommand.package) {
    throw new Error('BOOM (cannot happen but satisfies type checker)');
  }

  const time = buildTime(buildCommand.package);

  console.log('Building', buildCommand.package, 'takes', time, 'seconds');

  await sleep(time);

  console.log('Building done');

  const myId = pkgName(buildCommand.package, buildCommand);

  const readyConsumers = new Array<string>();

  for (const consumer of consumers(buildCommand.package)) {
    const response = await ddb.updateItem({
      TableName: process.env[BUILT_TABLE_ENVVAR]!,
      Key: { [TABLE_MODULE_KEY]: { S: pkgName(consumer, buildCommand) }},
      AttributeUpdates: {
        [SATISFIED_DEPS_KEY]: {
          Action: 'ADD',
          Value: { SS: [myId] },
        },
      },
      ReturnValues: 'ALL_NEW'
    }).promise();

    // If all dependencies for this package are now built, return it so that it
    // can be enqueued for building.
    const satisfied = response.Attributes ? response.Attributes[SATISFIED_DEPS_KEY].SS || [] : [];
    if (satisfied.length === dependencies(consumer).length) {
      readyConsumers.push(consumer);
    }
  }

  return readyConsumers;
}

function pkgName(pkg: string, context: BuildCommand) {
  return `/${context.buildIdentifier}/${pkg}`;
}

function chunk<A>(n: number, xs: A[]): A[][] {
  const ret = new Array<A[]>();
  for (let i = 0; i < xs.length; i += n) {
    ret.push(xs.slice(i * n, (i + 1) * n));
  }
  return ret;
}

function sleep(seconds: number) {
  return new Promise((ok, ko) => {
    setTimeout(ok, seconds * 1000);
  });
}