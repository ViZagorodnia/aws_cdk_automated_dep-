import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as cdk from 'aws-cdk-lib';
import { join } from 'path';
import { Construct } from 'constructs';

export class ProductServiceStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        // Define the getProductsList Lambda function
        const getProductsList = new lambda.Function(this, 'GetProductsList', {
            runtime: lambda.Runtime.NODEJS_20_X,
            memorySize: 1024,
            timeout: cdk.Duration.seconds(5),
            handler: 'getProductsList/index.handler',
            code: lambda.Code.fromAsset(join(__dirname, '/getProductsList')),
        });
        // Assuming 'getProductsList' is my Lambda function
        getProductsList.addToRolePolicy(new iam.PolicyStatement({
          resources: ['arn:aws:s3:::deploywebappstack-deploymentfrontendbucket67ceb713-dmeuplpxznej/*'],
          actions: ['s3:GetObject'],
        }));

        // Define the getProductsById Lambda function
        const getProductsById = new lambda.Function(this, 'GetProductsById', {
            runtime: lambda.Runtime.NODEJS_20_X,
            memorySize: 1024,
            timeout: cdk.Duration.seconds(5),
            handler: 'getProductsById/index.handler',
            code: lambda.Code.fromAsset(join(__dirname, '/getProductsById')),
        });

        // Assuming 'getProductsById' is my Lambda function
        getProductsById.addToRolePolicy(new iam.PolicyStatement({
          resources: ['arn:aws:s3:::deploywebappstack-deploymentfrontendbucket67ceb713-dmeuplpxznej/*'],
          actions: ['s3:GetObject'],
        }));

        // Define API Gateway
        const api = new apigateway.RestApi(this, "product-api", {
          restApiName: "Product Service API",
          description: "This service serves products."
        });

        // Define Lambda integration for /products
        const getProductsListIntegration = new apigateway.LambdaIntegration(getProductsList,  
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
        const getProductIntegration = new apigateway.LambdaIntegration(getProductsById, 
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

        // Define API method for getting all products
        const products = api.root.addResource('products');
        products.addMethod('GET', getProductsListIntegration, {
            methodResponses: [{ statusCode: "200" }],
        }); // HTTP GET /products

        products.addCorsPreflight({
          allowOrigins: apigateway.Cors.ALL_ORIGINS,
          allowMethods: ["GET"],
        });

        // Define API method for getting a single product by ID
        const singleProduct = products.addResource('{productId}');
        singleProduct.addMethod('GET', getProductIntegration, {
          methodResponses: [{ statusCode: "200" }],
        }); // HTTP GET /products/{productId}

        singleProduct.addCorsPreflight({
          allowOrigins: apigateway.Cors.ALL_ORIGINS,
          allowMethods: ["GET"],
        });
    }
}