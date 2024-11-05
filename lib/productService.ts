import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';
import { join } from 'path';

const PRODUCTS_TABLE_NAME = 'Products';
const STOCK_TABLE_NAME = 'Stock';

export class ProductServiceStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        // Define API Gateway
        const api = new apigateway.RestApi(this, "product-api-service", {
            restApiName: "Product Service API",
            description: "This service serves products.",
        });

        // Define DynamoDB tables
        const productsTable = new dynamodb.Table(this, "ProductsTable", {
            tableName: PRODUCTS_TABLE_NAME,
            partitionKey: {
                name: "id",
                type: dynamodb.AttributeType.STRING,
            },
        });

        const stockTable = new dynamodb.Table(this, "StockTable", {
            tableName: STOCK_TABLE_NAME,
            partitionKey: {
                name: "product_id",
                type: dynamodb.AttributeType.STRING,
            },
        });

        const getProductsLambdaFn = new lambda.Function(this, 
            "get-all-products-lambda-fn",
            {
                runtime: lambda.Runtime.NODEJS_20_X,
                memorySize: 1024,
                timeout: cdk.Duration.seconds(5),
                handler: 'index.handler',
                code: lambda.Code.fromAsset(join(__dirname, './lambda/getProductsList')),
                environment: {
                    PRODUCTS_TABLE_NAME: PRODUCTS_TABLE_NAME,
                    STOCK_TABLE_NAME: STOCK_TABLE_NAME,
                }
            }
        );

        const getProductsByIdLambdaFn = new lambda.Function(this,
            "get-product-by-id-lambda-fn",
            {
                runtime: lambda.Runtime.NODEJS_20_X,
                memorySize: 1024,
                timeout: cdk.Duration.seconds(5),
                handler: 'index.handler',
                code: lambda.Code.fromAsset(join(__dirname, './lambda/getProductsById')),
                environment: {
                    PRODUCTS_TABLE_NAME: PRODUCTS_TABLE_NAME,
                }
            }
        );

        const createProductLambdaFn = new lambda.Function(this,
            "create-product-lambda-fn",
            {
                runtime: lambda.Runtime.NODEJS_20_X,
                memorySize: 1024,
                timeout: cdk.Duration.seconds(5),
                handler: 'index.handler',
                code: lambda.Code.fromAsset(join(__dirname, './lambda/createProduct')),
                environment: {
                    PRODUCTS_TABLE_NAME: PRODUCTS_TABLE_NAME,
                    STOCK_TABLE_NAME: STOCK_TABLE_NAME,
                },
                
            }
        );

        const getProductsLambdaIntegration = new apigateway.LambdaIntegration(getProductsLambdaFn,
            {
                integrationResponses: [
                  {
                    statusCode: "200",
                  },
                ],
                proxy: true,
              }
        );

        const getProductByIdLambdaIntegration = new apigateway.LambdaIntegration(getProductsByIdLambdaFn,
            {
                integrationResponses: [
                  {
                    statusCode: "200",
                  },
                ],
                proxy: true,
              }
        );

        const createProductLambdaIntegration = new apigateway.LambdaIntegration(createProductLambdaFn,
            {
                integrationResponses: [
                    {
                    statusCode: "200",
                    },
                ],
                proxy: true,
            }
        );

        const productsResource = api.root.addResource("products");
        const oneProductResource = productsResource.addResource("{id}");

        productsResource.addMethod("GET", getProductsLambdaIntegration, {
            methodResponses: [{ statusCode: "200" }],
        });

        productsResource.addMethod("POST", createProductLambdaIntegration, {
            methodResponses: [{ statusCode: "200" }],
        });

        oneProductResource.addMethod("GET", getProductByIdLambdaIntegration, {
            methodResponses: [{ statusCode: "200" }],
        });

        productsResource.addCorsPreflight({
            allowOrigins: ["https://d2b4ydf5lv1f0v.cloudfront.net"],
            allowMethods: ["GET", "POST"],
        });

        productsTable.grantReadData(getProductsLambdaFn);
        stockTable.grantReadData(getProductsLambdaFn);

        productsTable.grantReadData(getProductsByIdLambdaFn);
        
        productsTable.grantWriteData(createProductLambdaFn);
        stockTable.grantWriteData(createProductLambdaFn);
    
    }
}