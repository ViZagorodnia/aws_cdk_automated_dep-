import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { CorsRule, HttpMethods } from "aws-cdk-lib/aws-s3";
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from "aws-cdk-lib/aws-iam";
import * as s3Notifications from "aws-cdk-lib/aws-s3-notifications";
import { join } from 'path';

export class ImportServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    
    const productsFileBucket = new s3.Bucket(this, 'imported-products-file-bucket', {
      versioned: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      cors: [{
        allowedOrigins: ["*"],
        allowedHeaders: ["*"],
        allowedMethods: [HttpMethods.GET, HttpMethods.PUT, HttpMethods.POST, HttpMethods.DELETE, HttpMethods.HEAD],
      }]
    });

    const api = new apigateway.RestApi(this, "import-products-service", {
      restApiName: "Import Product file Service API",
      description: "This service import products from file.",
    });

    const importedProductsFileLambdaFn = new lambda.Function(this,
      "import-products-lambda-fn",
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        memorySize: 1024,
        timeout: cdk.Duration.seconds(5),
        handler: 'index.handler',
        code: lambda.Code.fromAsset(join(__dirname, './lambda/importProductsFile')),
        environment: { BUCKET_NAME: productsFileBucket.bucketName },
      }
    );

    const importedFileParserLambdaFn = new lambda.Function(this,
      "imported-file-parser-lambda-fn",
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        memorySize: 1024,
        timeout: cdk.Duration.seconds(5),
        handler: 'index.handler',
        code: lambda.Code.fromAsset(join(__dirname, './lambda/importFileParser')),
        environment: { BUCKET_NAME: productsFileBucket.bucketName },
      }
    );

    const importedProductsFileLambdaIntegration = new apigateway.LambdaIntegration(importedProductsFileLambdaFn, {
      requestTemplates: {
        "application/json": `{ "name": "$input.params('name')", "ext": "$input.params('ext')" }`
      },
      integrationResponses: [{ statusCode: "200",},],
      proxy: true,
    });

    const importFileResource = api.root.addResource('import');
    importFileResource.addMethod('GET', importedProductsFileLambdaIntegration, {
      methodResponses: [{statusCode: '200'}],
    });

    importFileResource.addCorsPreflight({
      allowOrigins: ["https://d2b4ydf5lv1f0v.cloudfront.net/"],
      allowMethods: ["GET", "POST", "PUT", "DELETE"],
      allowHeaders: ["*"],
    })

    productsFileBucket.grantReadWrite(importedFileParserLambdaFn);
    productsFileBucket.grantReadWrite(importedProductsFileLambdaFn);
    productsFileBucket.grantPut(importedProductsFileLambdaFn);

    const bucketPolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ["s3:GetObject"],
      resources: [`${productsFileBucket.bucketArn}/uploaded/*`],
    });

    importedProductsFileLambdaFn.addToRolePolicy(bucketPolicy);

    productsFileBucket.addEventNotification(s3.EventType.OBJECT_CREATED, 
      new s3Notifications.LambdaDestination(importedFileParserLambdaFn),
      { prefix: "uploaded/" }
    );
  }
}