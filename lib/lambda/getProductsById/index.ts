import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";

const dynamoDBClient = new DynamoDBClient();
const documentClient = DynamoDBDocumentClient.from(dynamoDBClient);

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    console.log('Incoming request:', event);

    const tableName = process.env.PRODUCTS_TABLE_NAME || 'DefaultProductsTableName';
    const productId = event.pathParameters?.id;

    if (!productId) {
        return createResponse(400, { error: 'Product ID is required' });
    }

    try {
        const item = await fetchProductById(tableName, productId);
        if (item) {
            return createResponse(200, item);
        } else {
            return createResponse(404, { error: 'Product not found' });
        }
    } catch (error) {
        console.error('Error fetching product by ID:', error);
        return createResponse(500, { error: 'Failed to get product by ID. Please try again later.' });
    }
};

async function fetchProductById(tableName: string, productId: string) {
    const params = new GetCommand({
        TableName: tableName,
        Key: { id: productId },
    });
    const { Item } = await documentClient.send(params);
    return Item;
}

function createResponse(statusCode: number, body: object): APIGatewayProxyResult {
    const response = {
        statusCode: statusCode,
        body: JSON.stringify(body),
        headers: {
            "Access-Control-Allow-Headers": "Content-Type",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
        }
    };

    console.log('Response:', response);
    
    return response;
}