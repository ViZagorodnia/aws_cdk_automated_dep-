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
import { SendMessageBatchCommand, SQSClient } from '@aws-sdk/client-sqs';
import { pipeline } from 'stream/promises';
import { parse } from "csv-parse";

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
    const sqsClient = new SQSClient({ region: region });

    const record = event.Records[0];
    const key = record.s3.object.key;
    
    const getObjectParams: GetObjectCommandInput = {
      Bucket: bucketName,
      Key: key,
    };

    const getObjectCommand = new GetObjectCommand(getObjectParams);
    const response = await s3Client.send(getObjectCommand);

    const s3Stream = response.Body as Readable;

    const csvParser = parse({
      columns: true,
      skip_empty_lines: true,
    });
    const batchSize = 5;
    let batch: Promise<void>[] = [];

    const sendBatch = async () => {
      const sendMessageBatchCommand = new SendMessageBatchCommand({
        QueueUrl: process.env.SQS_QUEUE_URL!,
        Entries: batch.map((item, index) => ({
          Id: index.toString(),
          MessageBody: JSON.stringify(item),
        }))
      });

      try {
        const response = await sqsClient.send(sendMessageBatchCommand);
        console.log('Batch Message sent:', response);
      } catch (error) {
        console.error('Error sending batch message:', error);
      }
    };

    await pipeline(
      s3Stream,
      csvParser,
      async function* (source) {
        for await (const data of source) {
        batch.push(data);

        if (batch.length >= batchSize) {
            await sendBatch();
            batch = [];
          }
        }

        if (batch.length > 0) {
            await sendBatch();
        }
      }
    );

    const copyObjectParams: CopyObjectCommandInput = {
      Bucket: bucketName,
      CopySource: `${bucketName}/${key}`,
      Key: key.replace('uploaded/', 'parsed/'),
    };

    const copyObjectCommand = new CopyObjectCommand(copyObjectParams);
    await s3Client.send(copyObjectCommand);

    const deleteObjectCommand = new DeleteObjectCommand(getObjectParams);
    await s3Client.send(deleteObjectCommand); 
  } catch (error) {
    console.error("Error processing S3 event:", error);
  }
}