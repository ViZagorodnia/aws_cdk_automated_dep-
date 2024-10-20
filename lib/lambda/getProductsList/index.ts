import * as AWS from 'aws-sdk';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

const dynamo = new AWS.DynamoDB.DocumentClient();

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    // Fallback table name if the environment variable is not set
    const tableName = process.env.PRODUCTS_TABLE_NAME || 'DefaultProductsTableName'; 

    // Setting up parameters for the scan operation on DynamoDB
    const params = {
        TableName: tableName,
    };
    
    try {
        // Perform the scan operation to retrieve all records from the DynamoDB table
        const result = await dynamo.scan(params).promise();
        // Check if items exist and have length to return proper data
        if (result.Items && result.Items.length > 0) {
            return {
                statusCode: 200,
                body: JSON.stringify(result.Items),
                headers: {
                    "Access-Control-Allow-Headers" : "Content-Type",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
                }
            };
        } else {
            // Return a 404 status if no products are found
            return {
                statusCode: 404,
                body: JSON.stringify({ error: 'No products found' }),
                headers: {
                    "Access-Control-Allow-Headers" : "Content-Type",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
                }
            };
        }
    } catch (error) {
        // Log the error and return a server error status
        console.error('Error scanning DynamoDB:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Failed to retrieve product list' }),
            headers: {
                "Access-Control-Allow-Headers" : "Content-Type",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
            }
        };
    }
};