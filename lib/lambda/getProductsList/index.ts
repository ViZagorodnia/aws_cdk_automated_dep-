import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";

const dynamoDBClient = new DynamoDBClient();
const documentClient = DynamoDBDocumentClient.from(dynamoDBClient);

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    console.log('Incoming request:', event);

    const productsTableName = process.env.PRODUCTS_TABLE_NAME || 'DefaultProductsTableName';
    const stockTableName = process.env.STOCK_TABLE_NAME || 'DefaultStockTableName';

    try {
        const products = await scanTable(productsTableName);
        const stock = await scanTable(stockTableName);

        // Merge stock data into products based on 'id'/'product_id' match
        const mergedData = products.map(product => ({
            ...product,
            stock: stock.find(stockItem => stockItem.product_id === product.id)?.count || 0
        }));

        if (mergedData.length > 0) {
            return createResponse(200, mergedData);
        } else {
            return createResponse(404, { error: 'No products found' });
        }
    } catch (error) {
        console.error('Error retrieving data from DynamoDB:', error);
        return createResponse(500, { error: 'Failed to retrieve product list' });
    }
};

async function scanTable(tableName: string) {
    const params = new ScanCommand({ TableName: tableName });
    const { Items } = await documentClient.send(params);
    return Items || [];
}

function createResponse(statusCode: number, body: object): APIGatewayProxyResult {
    const response = {
        statusCode: statusCode,
        body: JSON.stringify(body),
        headers: {
            "Access-Control-Allow-Headers": "Content-Type",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
        },
    };

    console.log('Response:', response);
    
    return response;
}