import { APIGatewayProxyEvent } from "aws-lambda";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { fromSSO } from "@aws-sdk/credential-providers";

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
  if (!event.body) {
    return { statusCode: 400, body: { message: "File content must be provided in the request body" }};
  }
  
  const fileName = queryParams.name;
  const key = `uploaded/${fileName}`;
  const fileContent = Buffer.from(event.body, 'base64');
  
  try {
    await uploadFile(s3, bucketName, key, fileContent);
    const signedUrl = await generateSignedUrl(s3, bucketName, key);
    return { statusCode: 200, body: { signedUrl }};
  } catch (error) {
    console.error("Error generating signed URL:", error);
    return { statusCode: 500, body: { message: "Failed to generate signed URL" }};
  }
}

async function generateSignedUrl(s3: S3Client, bucketName: string, key: string): Promise<string> {
  const command = new PutObjectCommand({ Bucket: bucketName, Key: key });
  return getSignedUrl(s3, command);
}

async function uploadFile(s3: S3Client, bucketName: string, key: string, fileContent: Buffer) {
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: fileContent
  });
  await s3.send(command);
}

function formatResponse(statusCode: number, body: object): { statusCode: number, body: string, headers: object } {
  const response = {
    statusCode,
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