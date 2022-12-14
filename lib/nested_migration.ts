#!/usr/bin/env node

import 'source-map-support/register';
import { Construct } from 'constructs';
import {
  Stack,
  StackProps,
  NestedStack,
  NestedStackProps,
  App,
  aws_s3 as s3,
  aws_appsync as l1appsync
} from 'aws-cdk-lib';
import * as l2appsync from '@aws-cdk/aws-appsync-alpha'
import { AuthorizationType, BaseDataSource, IGraphqlApi, MappingTemplate, Schema } from '@aws-cdk/aws-appsync-alpha';
import * as path from 'path';

// Toggle this flag to test the migration process for the various stacks here.
const IS_INITIAL_STATE = true;

/********************
 * L1 AppSync Repro *
 ********************/

interface L1NestedResolverStackProps extends NestedStackProps {
  shouldCreateResolver: boolean;
  apiId: string;
  dataSourceName: string;
  persistentFieldName: string;
}

class L1NestedResolverStack extends NestedStack {
  constructor(scope: Construct, id: string, props: L1NestedResolverStackProps) {
    super(scope, id, props);

    new l1appsync.CfnResolver(this, `AttachedResolver${props.persistentFieldName}`, {
      apiId: props.apiId,
      typeName: 'Query',
      fieldName: props.persistentFieldName,
      dataSourceName: props.dataSourceName,
      requestMappingTemplate: '{}',
      responseMappingTemplate: '$util.toJson({})',
    });

    if (props.shouldCreateResolver) {
      new l1appsync.CfnResolver(this, `AttachedResolverrunQuery`, {
        apiId: props.apiId,
        typeName: 'Query',
        fieldName: 'runQuery',
        dataSourceName: props.dataSourceName,
        requestMappingTemplate: '{}',
        responseMappingTemplate: '$util.toJson({})',
      });
    }
  }
}

class L1AppSyncStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const api = new l1appsync.CfnGraphQLApi(this, 'API', {
      authenticationType: 'API_KEY',
      name: 'cdkBasedAPI',
    });

    new l1appsync.CfnGraphQLSchema(this, 'Schema', {
      apiId: api.attrApiId,
      definition: /* GraphQL */ `
      type Query {
        runQuery: String
        stackAQuery: String
        stackBQuery: String
      }

      type Mutation {}
      `
    });

    new l1appsync.CfnApiKey(this, 'ApiKey', {
      apiId: api.attrApiId,
    });

    const dataSource = new l1appsync.CfnDataSource(this, 'DataSource', {
      apiId: api.attrApiId,
      name: 'NONE_DS',
      type: 'NONE',
    });

    new L1NestedResolverStack(this, 'L1NestedResolverStackA', {
      shouldCreateResolver: IS_INITIAL_STATE,
      apiId: api.attrApiId,
      dataSourceName: dataSource.attrName,
      persistentFieldName: 'stackAQuery',
    });
    new L1NestedResolverStack(this, 'L1NestedResolverStackB', {
      shouldCreateResolver: !IS_INITIAL_STATE,
      apiId: api.attrApiId,
      dataSourceName: dataSource.attrName,
      persistentFieldName: 'stackBQuery',
    });  }
}

/********************
 * L2 AppSync Repro *
 ********************/

interface L2NestedResolverStackProps extends NestedStackProps {
  shouldCreateResolver: boolean;
  api: IGraphqlApi;
  dataSource: BaseDataSource;
  persistentFieldName: string;
}

class L2NestedResolverStack extends NestedStack {
  constructor(scope: Construct, id: string, props: L2NestedResolverStackProps) {
    super(scope, id, props);

    new l2appsync.Resolver(this, `AttachedResolver${props.persistentFieldName}`, {
      api: props.api,
      dataSource: props.dataSource,
      typeName: 'Query',
      fieldName: props.persistentFieldName,
      requestMappingTemplate: MappingTemplate.fromString('{}'),
      responseMappingTemplate: MappingTemplate.fromString('$util.toJson({})'),
    });

    if (props.shouldCreateResolver) {
      new l2appsync.Resolver(this, `AttachedResolverrunQuery`, {
        api: props.api,
        dataSource: props.dataSource,
        typeName: 'Query',
        fieldName: 'runQuery',
        requestMappingTemplate: MappingTemplate.fromString('{}'),
        responseMappingTemplate: MappingTemplate.fromString('$util.toJson({})'),
      });
    }
  }
}

class L2AppSyncStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const api = new l2appsync.GraphqlApi(this, 'API', {
      name: 'cdkBasedAPI',
      authorizationConfig: {
        defaultAuthorization: {
          authorizationType: AuthorizationType.API_KEY
        }
      },
      schema: Schema.fromAsset(path.join(__dirname, '..', 'assets', 'schema.graphql')),
    });

    const dataSource = new l2appsync.NoneDataSource(this, 'DataSource', {
      api,
      name: 'NONE_DS',
    });

    new L2NestedResolverStack(this, 'L2NestedResolverStackA', {
      shouldCreateResolver: IS_INITIAL_STATE,
      api,
      dataSource,
      persistentFieldName: 'stackAQuery',
    });
    new L2NestedResolverStack(this, 'L2NestedResolverStackB', {
      shouldCreateResolver: !IS_INITIAL_STATE,
      api,
      dataSource,
      persistentFieldName: 'stackBQuery',
    });
  }
}

/***************
 * L1 S3 Repro *
 ***************/

interface NestedQueueStackProps extends NestedStackProps {
  shouldCreateResource: boolean;
}

class L1NestedBucketStack extends NestedStack {
  constructor(scope: Construct, id: string, props: NestedQueueStackProps) {
    super(scope, id, props);

    if (props.shouldCreateResource) new s3.CfnBucket(this, 'Bucket', {
      bucketName: 'alharris-test-bucket123123',
    });
  }
}

class L1BucketStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    new L1NestedBucketStack(this, 'L1NestedBucketStackA', {
      shouldCreateResource: IS_INITIAL_STATE,
    });
    new L1NestedBucketStack(this, 'L1NestedBucketStackB', {
      shouldCreateResource: !IS_INITIAL_STATE,
    });
  }
}

/***************
 * L2 S3 Repro *
 ***************/

class L2NestedBucketStack extends NestedStack {
  constructor(scope: Construct, id: string, props: NestedQueueStackProps) {
    super(scope, id, props);

    if (props.shouldCreateResource) new s3.Bucket(this, 'L2Bucket', {
      bucketName: 'alharris-test-bucket987987',
    });
  }
}

class L2BucketStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    new L2NestedBucketStack(this, 'L2NestedBucketStackA', {
      shouldCreateResource: IS_INITIAL_STATE,
    });
    new L2NestedBucketStack(this, 'L2NestedBucketStackB', {
      shouldCreateResource: !IS_INITIAL_STATE,
    });
  }
}

const app = new App();

new L1AppSyncStack(app, 'L1AppSyncStack', {});
new L2AppSyncStack(app, 'L2AppSyncStack', {});
new L1BucketStack(app, 'L1BucketStack', {});
new L2BucketStack(app, 'L2BucketStack', {});
