import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';
import { join } from 'path';
import * as sqs from "aws-cdk-lib/aws-sqs";
import { SqsEventSource } from "aws-cdk-lib/aws-lambda-event-sources";
import { SubscriptionFilter, Topic } from "aws-cdk-lib/aws-sns";
import { EmailSubscription } from "aws-cdk-lib/aws-sns-subscriptions";
import { PolicyStatement } from "aws-cdk-lib/aws-iam";
import { Queue } from 'aws-cdk-lib/aws-sqs';

const PRODUCTS_TABLE_NAME = 'Products';
const STOCK_TABLE_NAME = 'Stock';

export class ProductServiceStack extends cdk.Stack {
    public readonly catalogItemsQueue: Queue; // Make the queue accessible
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

        
        // Define SQS
        this.catalogItemsQueue = new sqs.Queue(this, "product-items-queue-sqs");

        const createProductsTopic = new Topic(this, 'CreateProductsTopic', {
            displayName: 'Create Products Topic',
        });

        const catalogBatchProcessLambdaFn = new lambda.Function(this,
            "catalog-batch-process-lambda-fn",
            {
                runtime: lambda.Runtime.NODEJS_20_X,
                memorySize: 1024,
                timeout: cdk.Duration.seconds(5),
                handler: 'index.handler',
                code: lambda.Code.fromAsset(join(__dirname, './lambda/catalogBatchProcess')),
                environment: {
                    PRODUCTS_TABLE_NAME: PRODUCTS_TABLE_NAME,
                    STOCK_TABLE_NAME: STOCK_TABLE_NAME,
                    SNS_TOPIC_ARN: createProductsTopic.topicArn
                },
            }
        );

        catalogBatchProcessLambdaFn.addEventSource(new SqsEventSource(this.catalogItemsQueue, {
            batchSize: 5
        }));

        new cdk.CfnOutput(this, 'CatalogItemsQueueArn', {
            value: this.catalogItemsQueue.queueArn,
            exportName: 'CatalogItemsQueueArn',
        });

        new cdk.CfnOutput(this, 'CatalogItemsQueueUrl', {
            value: this.catalogItemsQueue.queueUrl,
            exportName: 'CatalogItemsQueueUrl',
        });


        const lowStockNumberEmailSubscription = new EmailSubscription('viktoriazagorodnia@gmail.com', {
            filterPolicy: {
                count:  SubscriptionFilter.numericFilter({
                    lessThanOrEqualTo: 2
                })
            }
        });

        const highStokNumberEmailSubscription = new EmailSubscription('yehornapolskyi@gmail.com', {
            filterPolicy: {
                count:  SubscriptionFilter.numericFilter({
                    greaterThan: 2
                })
            }
        });

        createProductsTopic.addSubscription(lowStockNumberEmailSubscription);
        createProductsTopic.addSubscription(highStokNumberEmailSubscription);
        createProductsTopic.grantPublish(catalogBatchProcessLambdaFn);
        productsTable.grantWriteData(catalogBatchProcessLambdaFn);
        stockTable.grantWriteData(catalogBatchProcessLambdaFn);
    }
}