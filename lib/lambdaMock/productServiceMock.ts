import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as cdk from 'aws-cdk-lib';
import { join } from 'path';
import { Construct } from 'constructs';

export class ProductServiceMockStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        // Define the getProductsList Lambda function
        const getProductsListLamFun = new lambda.Function(this, 'GetProductsList', {
            runtime: lambda.Runtime.NODEJS_20_X,
            memorySize: 1024,
            timeout: cdk.Duration.seconds(5),
            handler: 'getProductsList.main',
            code: lambda.Code.fromAsset(join(__dirname, './')),
        });

        // Define the getProductsById Lambda function
        const getProductsByIdLamFun = new lambda.Function(this, 'GetProductsById', {
            runtime: lambda.Runtime.NODEJS_20_X,
            memorySize: 1024,
            timeout: cdk.Duration.seconds(5),
            handler: 'getProductsById.main',
            code: lambda.Code.fromAsset(join(__dirname, './')),
        });

        // Define API Gateway
        const api = new apigateway.RestApi(this, "product-list-api", {
          restApiName: "Product Service API",
          description: "This service serves products."
        });

        // Define Lambda integration for /products
        const getProductsListIntegration = new apigateway.LambdaIntegration(getProductsListLamFun,  
          {
            integrationResponses: [
              {
                statusCode: "200",
              },
            ],
            proxy: false,
          }
        );

        // Define Lambda integration for /products/{productId}
        const getProductIntegration = new apigateway.LambdaIntegration(getProductsByIdLamFun, 
          {
            integrationResponses: [
              {
                statusCode: "200",
              },
            ],
            requestTemplates: {
              "application/json": JSON.stringify({
                pathParameters: {
                  productId: "$input.params('productId')",
                },
              }),
            },
            proxy: false,
          }
        );

        // Create resources for /products
        const productsListResource = api.root.addResource('products');
        productsListResource.addMethod('GET', getProductsListIntegration, {
            methodResponses: [{ statusCode: "200" }],
        });

        productsListResource.addCorsPreflight({
          allowOrigins: ["https://djp9o2z86kcm0.cloudfront.net/"],
          allowMethods: ["GET"],
        });

        // Create resources for /products/{productId}
        const singleProductResource = productsListResource.addResource('{productId}');
        singleProductResource.addMethod('GET', getProductIntegration, {
          methodResponses: [{ statusCode: "200" }],
        });

        singleProductResource.addCorsPreflight({
          allowOrigins: ["https://djp9o2z86kcm0.cloudfront.net/"],
          allowMethods: ["GET"],
        });
    }
}