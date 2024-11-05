import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { v4 as uuidv4 } from 'uuid';
import { Product, StockItem } from './types';

const dynamoDBClient = new DynamoDBClient();
const documentClient = DynamoDBDocumentClient.from(dynamoDBClient);

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    if (!event.body) {
        return createResponse(400, 'Invalid request: No body provided');
    }

    let userInput: Omit<Product, 'id' | 'img'>;
    try {
        userInput = JSON.parse(event.body);
    } catch (error) {
        console.error('Error parsing JSON:', error);
        return createResponse(400, 'Invalid request: Body is not valid JSON');
    }

    const id = uuidv4();
    const imgURL = "https://d2b4ydf5lv1f0v.cloudfront.net/assets/images/1.jpg";
    
    try {
        await createProduct(userInput, id, imgURL);
        return createResponse(201, { message: 'Product created successfully!', id });
    } catch (error) {
        console.error('Error interacting with DynamoDB:', error);
        return createResponse(500, 'Failed to create product');
    }
};

async function createProduct(userInput: Omit<Product, 'id' | 'img'>, id: string, imgURL: string) {
    const product: Product = { ...userInput, id, img: imgURL };
    const stockItem: StockItem = { product_id: id, count: product.count };

    await documentClient.send(new PutCommand({
        TableName: 'Products',
        Item: product
    }));

    await documentClient.send(new PutCommand({
        TableName: 'Stock',
        Item: stockItem
    }));
}

function createResponse(statusCode: number, message: string | object): APIGatewayProxyResult {
    return {
        statusCode: statusCode,
        body: JSON.stringify(typeof message === 'string' ? { message } : message),
        headers: {
            "Access-Control-Allow-Headers": "Content-Type",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
        },
    };
}