import { S3Event } from "aws-lambda";
import {
  CopyObjectCommand,
  CopyObjectCommandInput,
  DeleteObjectCommand,
  GetObjectCommand,
  GetObjectCommandInput,
  S3Client
} from '@aws-sdk/client-s3';
import { Readable } from 'stream';
import * as csv from 'csv-parser';

const region = process.env.AWS_REGION || "us-east-1"; // Default to us-east-1 if not specified

export async function handler(event: S3Event) {
  console.log("Received event:", event);
  try {
    const bucketName = process.env.BUCKET_NAME;
    
    if (!bucketName) {
      console.error("Bucket name is not specified in environment variables.");
      return;
    }

    const s3Client = new S3Client({ region: region });

    const record = event.Records[0];
    const key = record.s3.object.key;
    
    const getObjectParams: GetObjectCommandInput = {
      Bucket: bucketName,
      Key: key,
    };

    const getObjectCommand = new GetObjectCommand(getObjectParams);
    const response = await s3Client.send(getObjectCommand);

    const s3Stream = response.Body as Readable;

    s3Stream.pipe(csv())
      .on('data', (data: any) => console.log(data))
      .on('end', async () => {
        const copyObjectParams: CopyObjectCommandInput = {
            Bucket: bucketName,
            CopySource: `${bucketName}/${key}`,
            Key: key.replace('uploaded/', 'parsed/'),
        };

        const copyObjectCommand = new CopyObjectCommand(copyObjectParams);
        await s3Client.send(copyObjectCommand);

        const deleteObjectCommand = new DeleteObjectCommand(getObjectParams);
        await s3Client.send(deleteObjectCommand);
    });
  } catch (error) {
    console.error("Error processing S3 event:", error);
  }
}