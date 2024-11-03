import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { PolicyStatement, Effect } from "aws-cdk-lib/aws-iam";
import { Bucket, EventType } from "aws-cdk-lib/aws-s3";
import { Function, Runtime, Code } from "aws-cdk-lib/aws-lambda";
import { RestApi, LambdaIntegration } from "aws-cdk-lib/aws-apigateway";
import { LambdaDestination } from "aws-cdk-lib/aws-s3-notifications";
import { join } from 'path';

export class ImportServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    
    const productsFileBucket = this.createProductsFileBucket();
    const api = this.createAPIGateway();
    const [importedProductsFileLambda, importedFileParserLambda] = this.createLambdaFunctions(productsFileBucket);

    this.configureBucketNotifications(productsFileBucket, importedFileParserLambda);
    this.addAPIIntegration(api, importedProductsFileLambda);
  }

  private createProductsFileBucket(): Bucket {
    return new Bucket(this, "imported-products-file-bucket", {
      versioned: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });
  }

  private createAPIGateway(): RestApi {
    return new RestApi(this, "imported-files-api", {
      restApiName: "API Gateway for import service",
      description: "This API serves the import lambda functions.",
    });
  }

  private createLambdaFunctions(bucket: Bucket): Function[] {
    const handlerConfig = {
      runtime: Runtime.NODEJS_20_X,
      memorySize: 1024,
      timeout: cdk.Duration.seconds(5),
      code: Code.fromAsset(join(__dirname, './lambda')),
      environment: { BUCKET_NAME: bucket.bucketName },
    };
    
    const importedProductsFileLambda = new Function(this, "imported-products-file-lambda", {
      ...handlerConfig,
      handler: 'importProductsFile.index.handler'
    });
    
    const importedFileParserLambda = new Function(this, "imported-file-parser-lambda", {
      ...handlerConfig,
      handler: 'importFileParser.index.handler'
    });

    bucket.grantRead(importedProductsFileLambda);
    bucket.grantRead(importedFileParserLambda);
    importedProductsFileLambda.addToRolePolicy(new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ["s3:GetObject"],
      resources: [`${bucket.bucketArn}/uploaded/*`],
    }));

    return [importedProductsFileLambda, importedFileParserLambda];
  }
  
  private configureBucketNotifications(bucket: Bucket, lambdaFunction: Function): void {
    bucket.addEventNotification(EventType.OBJECT_CREATED, new LambdaDestination(lambdaFunction), {
      prefix: "uploaded/"
    });
  }

  private addAPIIntegration(api: RestApi, lambdaFunction: Function): void {
    const lambdaIntegration = new LambdaIntegration(lambdaFunction, {
      requestTemplates: {
        "application/json": `{ "fileName": "$input.params('fileName')", "ext": "$input.params('ext')" }`
      },
      integrationResponses: [{ statusCode: "200" }],
      proxy: true,
    });

    const importsResource = api.root.addResource("import");
    importsResource.addMethod("GET", lambdaIntegration, {
      methodResponses: [{ statusCode: "200" }],
    });

    importsResource.addCorsPreflight({
      allowOrigins: ["https://djp9o2z86kcm0.cloudfront.net"],
      allowMethods: ["GET"],
    });
  }
}