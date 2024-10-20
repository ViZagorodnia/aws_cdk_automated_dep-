import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";

const dynamoDBClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const documentClient = DynamoDBDocumentClient.from(dynamoDBClient);

export const manage = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const tableName = process.env.PRODUCTS_TABLE_NAME;

    if (!tableName) {
        console.error('Table name is not set in the environment variables.');
        return { statusCode: 500, body: 'Server configuration error.' };
    }

    switch (event.httpMethod) {
        case 'GET':
            if (event.pathParameters) {
                return getProduct(event, tableName);
            }
            return { statusCode: 400, body: 'Missing path parameters.' };
        case 'POST':
            return createProduct(event, tableName);
        default:
            return { statusCode: 405, body: 'Method Not Allowed.' };
    }
};

const getProduct = async (event: APIGatewayProxyEvent, tableName: string): Promise<APIGatewayProxyResult> => {
    const productId = event.pathParameters?.productId ?? null;
    
    if (!productId) {
        return { statusCode: 400, body: 'Product ID is required.' };
    }
    
    const params = new GetCommand({
        TableName: tableName,
        Key: { id: productId }
    });

    try {
        const { Item } = await documentClient.send(params);
        if (!Item) {
            return { statusCode: 404, body: 'Product not found.' };
        }
        return { statusCode: 200, body: JSON.stringify(Item) };
    } catch (error) {
        console.error('Error fetching product:', error);
        return { statusCode: 500, body: 'Failed to get product.' };
    }
};

const createProduct = async (event: APIGatewayProxyEvent, tableName: string): Promise<APIGatewayProxyResult> => {
  if (!event.body) {
      return { statusCode: 400, body: 'Product data is required' };
  }

  let product;
  try {
      product = JSON.parse(event.body);
  } catch (error) {
      console.error('Error parsing product data:', error);
      return { statusCode: 400, body: 'Invalid product data format.' };
  }

  const params = new PutCommand({
      TableName: tableName,
      Item: product
  });

  try {
      await documentClient.send(params);
      return { statusCode: 201, body: JSON.stringify(product) };
  } catch (error) {
      console.error('Error creating product:', error);
      return { statusCode: 500, body: 'Failed to create product.' };
  }
};