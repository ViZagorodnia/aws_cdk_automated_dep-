import { APIGatewayProxyEvent } from "aws-lambda";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export async function handler(event: APIGatewayProxyEvent) {
  const bucketName = process.env.BUCKET_NAME as string;
  const queryParams = event.queryStringParameters;

  const s3 = new S3Client({ region: "us-east-1" });

  if (!queryParams || !queryParams.fileName) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        message: "File name is required in the query string",
      }),
    };
  }

  const ext = queryParams.ext ?? "csv";

  const key = `uploaded/${queryParams.fileName}.${ext}`;

  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: key,
  });

  const signedUrl = await getSignedUrl(s3, command);

  return {
    statusCode: 200,
    body: JSON.stringify({ signedUrl }),
  };
}