#!/usr/bin/env node

import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as appsync from 'aws-cdk-lib/aws-appsync';

//
// Initial State
//
// cdk-app/
// ├─ appsync-stack/
// │  ├─ appsync-api
// │  ├─ nested-resolver-stack-a/
// │  │  ├─ appsync-resolver
// │  ├─ nested-resolver-stack-b/
// ├─ event-stack/
// │  ├─ nested-queue-stack-a/
// │  │  ├─ sqs-queue
// │  ├─ nested-queue-stack-b/
//
// Second Deployment State
//
// cdk-app/
// ├─ appsync-stack/
// │  ├─ appsync-api
// │  ├─ nested-resolver-stack-a/
// │  ├─ nested-resolver-stack-b/
// │  │  ├─ appsync-resolver
// ├─ event-stack/
// │  ├─ nested-queue-stack-a/
// │  ├─ nested-queue-stack-b/
// │  │  ├─ sqs-queue
//

const IS_INITIAL_STATE = true;

const createResolver = (scope: Construct, apiId: string) => new appsync.CfnResolver(scope, 'AttachedResolver', {
  apiId,
  typeName: 'Query',
  fieldName: 'runQuery',
  dataSourceName: 'NONE_DS',
  requestMappingTemplate: '{}',
  responseMappingTemplate: '$util.toJson({})',
});

const createQueue = (scope: Construct) => new sqs.Queue(scope, 'AttachedQueue', {});

interface NestedResolverStackProps extends cdk.StackProps {
  shouldCreateResolver: boolean;
  apiId: string;
}

class NestedResolverStack extends cdk.NestedStack {
  constructor(scope: Construct, id: string, props: NestedResolverStackProps) {
    super(scope, id, props);

    if (props.shouldCreateResolver) createResolver(this, props.apiId);
  }
}

class AppSyncStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const api = new appsync.CfnGraphQLApi(this, 'API', {
      authenticationType: 'API_KEY',
      name: 'cdkBasedAPI',
    });

    new appsync.CfnGraphQLSchema(this, 'Schema', {
      apiId: api.attrApiId,
      definition: /* GraphQL */ `
      type Query {
        runQuery: String
      }

      type Mutation {}
      `
    });

    new appsync.CfnApiKey(this, 'ApiKey', {
      apiId: api.attrApiId,
    });

    new appsync.CfnDataSource(this, 'DataSource', {
      apiId: api.attrApiId,
      name: 'NONE_DS',
      type: 'NONE',
    });

    new NestedResolverStack(this, 'NestedResolverStackA', {
      shouldCreateResolver: IS_INITIAL_STATE,
      apiId: api.attrApiId,
    });
    new NestedResolverStack(this, 'NestedResolverStackB', {
      shouldCreateResolver: !IS_INITIAL_STATE,
      apiId: api.attrApiId,
    });  }
}

interface NestedQueueStackProps extends cdk.StackProps {
  shouldCreateResource: boolean;
}

class NestedQueueStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: NestedQueueStackProps) {
    super(scope, id, props);

    if (props.shouldCreateResource) createQueue(this);
  }
}

class EventStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    new NestedQueueStack(this, 'NestedQueueStackA', {
      shouldCreateResource: IS_INITIAL_STATE,
    });
    new NestedQueueStack(this, 'NestedQueueStackB', {
      shouldCreateResource: !IS_INITIAL_STATE,
    });
  }
}

const app = new cdk.App();

new AppSyncStack(app, 'AppSyncStack', {});
new EventStack(app, 'EventStack', {});
