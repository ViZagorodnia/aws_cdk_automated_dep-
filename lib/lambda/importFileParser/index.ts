import { S3Event } from "aws-lambda";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { Readable } from "stream";
import { parse as csvParse } from "csv-parse";

const region = process.env.AWS_REGION || "us-east-1"; // Default to us-east-1 if not specified

export async function handler(event: S3Event) {
  const bucketName = process.env.BUCKET_NAME;
  
  if (!bucketName) {
    console.error("Bucket name is not specified in environment variables.");
    return;
  }

  const s3Client = new S3Client({ region });
  const record = event.Records[0];
  
  try {
    const csvData = await fetchAndParseCSV(s3Client, bucketName, record.s3.object.key);
    console.log("CSV Data: ", csvData);
  } catch (error) {
    console.error("Error processing record", error);
  }
}

async function fetchAndParseCSV(s3Client: S3Client, bucketName: string, objectKey: string): Promise<string[][]> {
  const getObjectParams = { Bucket: bucketName, Key: objectKey };
  const response = await s3Client.send(new GetObjectCommand(getObjectParams));

  if (!(response.Body instanceof Readable)) {
    throw new Error("Expected body to be an instance of stream.Readable");
  }

  return streamToCSV(response.Body);
}

function streamToCSV(stream: Readable): Promise<string[][]> {
  return new Promise((resolve, reject) => {
    const records: string[][] = [];
    stream.pipe(csvParse({ delimiter: "|" }))
      .on("data", (record: string[]) => records.push(record))
      .on("end", () => {
        console.log("Stream processing completed.");
        resolve(records);
      })
      .on("error", (error: Error) => {
        console.error("Error during stream parsing: ", error);
        reject(error);
      });
  });
}