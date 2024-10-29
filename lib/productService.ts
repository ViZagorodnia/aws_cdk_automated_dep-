import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';
import { join } from 'path';

export class ProductServiceStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        // Define IAM role for Lambda functions
        const lambdaRole = new iam.Role(this, 'LambdaExecutionRole', {
            assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
            managedPolicies: [
                iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
                iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonDynamoDBFullAccess'), // Consider using more restrictive policies in production
            ],
        });
        
        // Add policy for access to S3 resources (as needed)
        lambdaRole.addToPolicy(new iam.PolicyStatement({
            actions: ['s3:GetObject'],
            resources: ['arn:aws:s3:::deploywebappstack-deploymentfrontendbucket67ceb713-dmeuplpxznej/*'],
        }));

        // Define DynamoDB tables
        const productsTable = new dynamodb.Table(this, "ProductsTable", {
            tableName: 'Products',
            partitionKey: {
                name: "id",
                type: dynamodb.AttributeType.STRING,
            },
        });

        const stockTable = new dynamodb.Table(this, "StockTable", {
            tableName: 'Stock',
            partitionKey: {
                name: "product_id",
                type: dynamodb.AttributeType.STRING,
            },
        });

        // Define the Lambda function to manage products
        const manageProducts = new lambda.Function(this, 'ManageProducts', {
            runtime: lambda.Runtime.NODEJS_20_X,
            memorySize: 1024,
            timeout: cdk.Duration.seconds(5),
            handler: 'manageProducts.handler',
            code: lambda.Code.fromAsset(join(__dirname, './lambda/manageProducts')),
            role: lambdaRole,
            environment: {
                PRODUCTS_TABLE_NAME: productsTable.tableName,
                STOCK_TABLE_NAME: stockTable.tableName,
            }
        });

        productsTable.grantReadWriteData(manageProducts);
        stockTable.grantReadWriteData(manageProducts);

        // Define API Gateway
        const api = new apigateway.RestApi(this, "product-api", {
            restApiName: "Product Service API",
            description: "This service serves products.",
            defaultCorsPreflightOptions: {
                allowOrigins: apigateway.Cors.ALL_ORIGINS,
                allowMethods: apigateway.Cors.ALL_METHODS
            }
        });

        // Define Lambda integration for managing products
        const manageProductsIntegration = new apigateway.LambdaIntegration(manageProducts);

        // Define API methods for product management
        const products = api.root.addResource('products');
        products.addMethod('GET', manageProductsIntegration); // List or get single product
        products.addMethod('POST', manageProductsIntegration); // Create a new product

        const singleProduct = products.addResource('{productId}');
        singleProduct.addMethod('GET', manageProductsIntegration); // Get a single product by ID
    }
}