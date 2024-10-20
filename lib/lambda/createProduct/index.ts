import * as AWS from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';  // UUID generation
import { Product, StockItem } from './types';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

const dynamoDB = new AWS.DynamoDB.DocumentClient();

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    if (!event.body) {
        return {
          statusCode: 400,
          body: JSON.stringify({ message: 'Invalid request: No body provided' }),
          headers: {
            "Access-Control-Allow-Headers" : "Content-Type",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
          },
        };
    }

    let userInput: Omit<Product, 'productId' | 'img'>;
    try {
        userInput = JSON.parse(event.body);
    } catch (error) {
        console.error('Error parsing JSON:', error);
        return {
            statusCode: 400,
            body: JSON.stringify({ message: 'Invalid request: Body is not valid JSON' }),
            headers: {
              "Access-Control-Allow-Headers" : "Content-Type",
              "Access-Control-Allow-Origin": "*",
              "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
            },
        };
    }

    const product: Product = {
        ...userInput,
        productId: uuidv4(),  // unique identifier
        img: "https://djp9o2z86kcm0.cloudfront.net/assets/images/1.jpg"
    };

    const stockItem: StockItem = {
        product_id: product.productId,
        count: product.count
    };

    try {
        // add item to 'Products' table
        await dynamoDB.put({
            TableName: 'Products',
            Item: product
        }).promise();

        // add item to 'Stock' table
        await dynamoDB.put({
            TableName: 'Stock',
            Item: stockItem
        }).promise();

        return {
            statusCode: 201,
            body: JSON.stringify({ message: 'Product created successfully!', productId: product.productId }),
            headers: {
              "Access-Control-Allow-Headers" : "Content-Type",
              "Access-Control-Allow-Origin": "*",
              "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
            },
        };
    } catch (error) {
        console.error('Error interacting with DynamoDB:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Failed to create product' }),
            headers: {
              "Access-Control-Allow-Headers" : "Content-Type",
              "Access-Control-Allow-Origin": "*",
              "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
            },
        };
    }
};