import * as AWS from 'aws-sdk';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

const dynamo = new AWS.DynamoDB.DocumentClient();

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const tableName = process.env.PRODUCTS_TABLE_NAME || 'DefaultProductsTableName'; 

    // Перевірка, що pathParameters і productId існують
    const productId = event.pathParameters?.productId;
    if (!productId) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Product ID is required' }),
            headers: {
                "Access-Control-Allow-Headers" : "Content-Type",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
            },
        };
    }
  
    const params = {
        TableName: tableName,
        Key: {
            id: productId
        },
    };
    
    try {
        const result = await dynamo.get(params).promise();
        if (result.Item) {
            return {
                statusCode: 200,
                body: JSON.stringify(result.Item),
                headers: {
                    "Access-Control-Allow-Headers" : "Content-Type",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
                },
            };
        } else {
            return {
                statusCode: 404,
                body: JSON.stringify({ error: 'Product not found' }),
                headers: {
                    "Access-Control-Allow-Headers" : "Content-Type",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
                },
            };
        }
    } catch (error) {
        console.error('Error fetching product by ID:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Failed to get product by ID. Please try again later.' }),
            headers: {
                "Access-Control-Allow-Headers" : "Content-Type",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
            },
        };
    }
};