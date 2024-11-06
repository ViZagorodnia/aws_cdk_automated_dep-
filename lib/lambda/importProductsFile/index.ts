import { APIGatewayProxyEvent } from "aws-lambda";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export async function handler(event: APIGatewayProxyEvent) {
  console.log('Incoming request:', event);

  const bucketName = process.env.BUCKET_NAME as string;
  const s3 = new S3Client({ region: "us-east-1" });
  
  const response = await processEvent(event, s3, bucketName);
  return formatResponse(response.statusCode, response.body);
}

async function processEvent(event: APIGatewayProxyEvent, s3: S3Client, bucketName: string) {
  const queryParams = event.queryStringParameters;

  if (!queryParams || !queryParams.name) {
    return { statusCode: 400, body: { message: "File name is required in the query string" }};
  }
  
  const fileName = queryParams.name;
  const key = `uploaded/${fileName}`;
  
  try {
    const signedUrl = await generateSignedUrl(s3, bucketName, key);
    return { statusCode: 200, body: signedUrl };
  } catch (error) {
    console.error("Error generating signed URL:", error);
    return { statusCode: 500, body: { message: "Failed to generate signed URL" }};
  }
}

async function generateSignedUrl(s3: S3Client, bucketName: string, key: string): Promise<string> {
  const command = new PutObjectCommand({ Bucket: bucketName, Key: key });
  return getSignedUrl(s3, command);
}

function formatResponse(statusCode: number, body: unknown): { statusCode: number, body: string, headers: object } {
  const response = {
    statusCode,
    body: JSON.stringify(body),
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
      'Access-Control-Allow-Methods': 'OPTIONS,GET,POST,PUT',
    },
  };
  console.log('Response:', response);
  return response;
}