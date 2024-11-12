import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import {
  AuthorizationType,
  CfnGatewayResponse,
  JsonSchemaType,
  LambdaIntegration,
  MethodOptions,
  Model,
  RestApi,
  TokenAuthorizer
} from "aws-cdk-lib/aws-apigateway";
import * as s3 from 'aws-cdk-lib/aws-s3';
import { HttpMethods } from "aws-cdk-lib/aws-s3";
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from "aws-cdk-lib/aws-iam";
import * as s3Notifications from "aws-cdk-lib/aws-s3-notifications";
import { join } from 'path';
import { Queue } from "aws-cdk-lib/aws-sqs";
import { ServicePrincipal } from "aws-cdk-lib/aws-iam";


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

    const api = new RestApi(this, "import-products-service", {
      restApiName: "Import Product file Service API",
      description: "This service import products from file.",
    });

    const catalogItemsQueueUrl = cdk.Fn.importValue('CatalogItemsQueueUrl');
    const catalogItemsQueueArn = cdk.Fn.importValue('CatalogItemsQueueArn');

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
        environment: { 
          BUCKET_NAME: productsFileBucket.bucketName,
          SQS_QUEUE_URL: catalogItemsQueueUrl
        },
      }
    );
    const importedProductsFileLambdaIntegration = new LambdaIntegration(importedProductsFileLambdaFn, {
      requestTemplates: {
        "application/json": `{ "name": "$input.params('name')", "ext": "$input.params('ext')" }`
      },
      integrationResponses: [{ statusCode: "200",},],
      proxy: true,
    });

    const basicAuthorizerArn = cdk.Fn.importValue('BasicAuthorizerArn');
    const basicAuthorizer = lambda.Function.fromFunctionAttributes(this, 'BasicAuthorizer', {
      functionArn: basicAuthorizerArn,
      sameEnvironment: true
    });
    const methodArn = api.arnForExecuteApi(
      'GET',
      '/import',
      '*'
    );

    basicAuthorizer.addPermission('InvokeByAPIGateway', {
      principal: new ServicePrincipal('apigateway.amazonaws.com'),
      action: 'lambda:InvokeFunction',
      sourceArn: methodArn
    });
    const tokenAuthorizer = new TokenAuthorizer(this, 'TokenAuthorizer', {
      handler: basicAuthorizer,
      identitySource: 'method.request.header.Authorization',
    });

    const responseModel = new Model(this, 'ResponseModel', {
      restApi: api,
      contentType: 'application/json',
      schema: {
          type: JsonSchemaType.STRING,
      },
    });

    const methodOptions: MethodOptions = {
      methodResponses: [
        {
          statusCode: '200',
          responseModels: {
            'application/json': responseModel,
          },
        },
        {
          statusCode: '400',
          responseModels: {
            'application/json': Model.ERROR_MODEL,
          },
        },
        {
          statusCode: '401',
          responseModels: {
            'application/json': Model.ERROR_MODEL,
          },
        },
        {
          statusCode: '403',
          responseModels: {
            'application/json': Model.ERROR_MODEL,
          },
        },
        {
          statusCode: '500',
          responseModels: {
            'application/json': Model.ERROR_MODEL,
          },
        },
      ],
      authorizer: tokenAuthorizer,
      authorizationType: AuthorizationType.CUSTOM,
    };

    const importFileResource = api.root.addResource('import');
    importFileResource.addMethod('GET', importedProductsFileLambdaIntegration, methodOptions);

    new CfnGatewayResponse(this, 'APIGatewayUnauthorizedResponse', {
      restApiId: api.restApiId,
      responseType: 'UNAUTHORIZED',
      statusCode: '401',
      responseParameters: {
          'gatewayresponse.header.Access-Control-Allow-Origin': "'https://d2b4ydf5lv1f0v.cloudfront.net/'",
          'gatewayresponse.header.Access-Control-Allow-Headers': "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'",
          'gatewayresponse.header.Access-Control-Allow-Methods': "'GET,OPTIONS'"
      },
      responseTemplates: {
          'application/json': '{"message": "Unauthorized. Please provide valid credentials."}'
      }
    });

    new CfnGatewayResponse(this, 'APIGatewayForbiddenResponse', {
      restApiId: api.restApiId,
      responseType: 'ACCESS_DENIED',
      statusCode: '403',
      responseParameters: {
        'gatewayresponse.header.Access-Control-Allow-Origin': "'https://d2b4ydf5lv1f0v.cloudfront.net/'",
        'gatewayresponse.header.Access-Control-Allow-Headers': "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Amz-User-Agent'",
        'gatewayresponse.header.Access-Control-Allow-Methods': "'GET,OPTIONS'"
      },
      responseTemplates: {
        'application/json': '{"message": "Forbidden. You do not have permission to access this resource."}'
      }
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

    const catalogItemsQueue = Queue.fromQueueArn(this, 'CatalogItemsQueue', catalogItemsQueueArn);
    catalogItemsQueue.grantSendMessages(importedFileParserLambdaFn);
  }
}