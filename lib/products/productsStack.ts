import { Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as cdk from 'aws-cdk-lib';
import { join } from 'path';

export class ProductStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

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

    const manageProductLambda = new lambda.Function(this, 'ManageProductLambda', {
      runtime: lambda.Runtime.NODEJS_20_X,
      memorySize: 1024,
      timeout: cdk.Duration.seconds(5),
      handler: 'productHandler.manage',
      code: lambda.Code.fromAsset(join(__dirname, './')),
      environment: {
        PRODUCTS_TABLE_NAME: productsTable.tableName,
        STOCK_TABLE_NAME: stockTable.tableName,
      }
    });

    productsTable.grantReadWriteData(manageProductLambda);
    stockTable.grantReadWriteData(manageProductLambda);

    new cdk.CfnOutput(this, 'ManageProductLambdaOutput', {
      value: manageProductLambda.functionArn,
      exportName: 'ManageProductLambdaArn',
    });
  }
}