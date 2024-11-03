import { APIGatewayProxyEvent } from "aws-lambda";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export async function handler(event: APIGatewayProxyEvent) {
  const bucketName = process.env.BUCKET_NAME as string;
  const s3 = new S3Client({ region: "us-east-1" });
  
  const response = await processEvent(event, s3, bucketName);
  return formatResponse(response.statusCode, response.body);
}

async function processEvent(event: APIGatewayProxyEvent, s3: S3Client, bucketName: string) {
  const queryParams = event.queryStringParameters;

  if (!queryParams || !queryParams.fileName) {
    return { statusCode: 400, body: { message: "File name is required in the query string" }};
  }
  
  const fileName = queryParams.fileName;
  const ext = queryParams.ext || "csv";
  const key = `uploaded/${fileName}.${ext}`;
  
  try {
    const signedUrl = await generateSignedUrl(s3, bucketName, key);
    return { statusCode: 200, body: { signedUrl }};
  } catch (error) {
    console.error("Error generating signed URL:", error);
    return { statusCode: 500, body: { message: "Failed to generate signed URL" }};
  }
}

async function generateSignedUrl(s3: S3Client, bucketName: string, key: string): Promise<string> {
  const command = new GetObjectCommand({ Bucket: bucketName, Key: key });
  return getSignedUrl(s3, command);
}

function formatResponse(statusCode: number, body: object): { statusCode: number, body: string } {
  return {
    statusCode,
    body: JSON.stringify(body),
  };
}