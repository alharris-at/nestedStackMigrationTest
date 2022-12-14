# L1 and L2 CDK Construct Resource Migration Tests

## About

This is a test project to help understand the state of affairs when moving a CFN resource between nested stacks.

I'm testing this for AppSync (which is what I'm trying to understand more about), and using S3 as a benchmark.

Testing both the L1 and L2 constructs for both of these services.

In order to reproduce this, ensure the `IS_INITIAL_STATE` flag in `lib/nested_migration.ts` flag is set to `true`, and run `cdk deploy --all`, then after deployments are complete, toggle the flag to `false` and attempt to deploy these stacks.

## Results

### L1BucketStack

Bucket migration to another stack fails with error:

```
alharris-test-bucket123123 already exists in stack arn:aws:cloudformation:us-east-1:<accountId>:stack/L1BucketStack-L1NestedBucketStackANestedStackL1NestedBucketStackANestedStackResource87-1KKIMHRFC63HQ/7d98e910-7bdf-11ed-af6d-127fa318bc33
```

### L2BucketStack

Bucket migration to another stack fails with error:

```
alharris-test-bucket987987 already exists in stack arn:aws:cloudformation:us-east-1:<accountId>:stack/L2BucketStack-L2NestedBucketStackANestedStackL2NestedBucketStackANestedStackResource59-TOVLZZMQBDNM/dc1105e0-7bdf-11ed-b8ec-0ead4def83c5
```

### L1AppSyncStack

Issue happened inconsistently (perhap)

Resolver migration to another stack fails with error:

```
Only one resolver is allowed per field. (Service: AWSAppSync; Status Code: 400; Error Code: BadRequestException; Request ID: 6bec264c-9962-498e-a059-5805c28c544a; Proxy: null)
```

### L2AppSyncStack

Resolver migration to another stack fails with error:

```
Only one resolver is allowed per field. (Service: AWSAppSync; Status Code: 400; Error Code: BadRequestException; Request ID: 6bec264c-9962-498e-a059-5805c28c544a; Proxy: null)
```

# Useful commands

* `npm run build`   compile typescript to js
* `npm run watch`   watch for changes and compile
* `npm run test`    perform the jest unit tests
* `npm run clean`   cleans the cdk.out directory if you want to manually inspect, and there are too many files
* `cdk deploy`      deploy this stack to your default AWS account/region
* `cdk diff`        compare deployed stack with current state
* `cdk synth`       emits the synthesized CloudFormation template
