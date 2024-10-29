import * as s3 from "aws-cdk-lib/aws-s3";
import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { join } from 'path';
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as s3Notifications from "aws-cdk-lib/aws-s3-notifications";

export class ImportServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const productsFileBucket = new s3.Bucket(this, "imported-products-file-bucket", {
      versioned: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    const api = new apigateway.RestApi(this, "imported-files-api", {
      restApiName: "API Gateway for import service",
      description: "This API serves the import lambda functions.",
    });

    const importedProductsFileLambdaFunction = new lambda.Function(
      this,
      "imported-products-file-lambda-function",
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        memorySize: 1024,
        timeout: cdk.Duration.seconds(5),
        handler: 'index.handler',
        code: lambda.Code.fromAsset(join(__dirname, './lambda/importProductsFile')),
        environment: {
          BUCKET_NAME: productsFileBucket.bucketName,
        },
      }
    );

    const importedFileParserLambdaFunction = new lambda.Function(
      this,
      "imported-file-parser-lambda-function",
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        memorySize: 1024,
        timeout: cdk.Duration.seconds(5),
        handler: 'index.handler',
        code: lambda.Code.fromAsset(join(__dirname, './lambda/importFileParser')),
        environment: {
          BUCKET_NAME: productsFileBucket.bucketName,
        },
      }
    );

    productsFileBucket.grantRead(importedProductsFileLambdaFunction);
    productsFileBucket.grantRead(importedFileParserLambdaFunction);

    const s3Policy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ["s3:GetObject"],
      resources: [`${productsFileBucket.bucketArn}/uploaded/*`],
    });

    importedProductsFileLambdaFunction.addToRolePolicy(s3Policy);

    productsFileBucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3Notifications.LambdaDestination(importedFileParserLambdaFunction),
      { prefix: "uploaded/" }
    );

    const importProductsFileLambdaIntegration =
      new apigateway.LambdaIntegration(importedProductsFileLambdaFunction, {
        requestTemplates: {
          "application/json": `{ "fileName": "$input.params('fileName')", "ext": "$input.params('ext')" }`,
        },
        integrationResponses: [
          {
            statusCode: "200",
          },
        ],
        proxy: true,
      });

    const importsResource = api.root.addResource("import");

    importsResource.addMethod("GET", importProductsFileLambdaIntegration, {
      methodResponses: [{ statusCode: "200" }],
    });

    importsResource.addCorsPreflight({
      allowOrigins: ["https://djp9o2z86kcm0.cloudfront.net/"],
      allowMethods: ["GET"],
    });
  }
}