import { S3Event } from "aws-lambda";
import {
  GetObjectCommand,
  GetObjectCommandInput,
  S3Client
} from '@aws-sdk/client-s3';
import { Readable } from 'stream';
import { SendMessageCommand, SQSClient, SendMessageCommandOutput } from '@aws-sdk/client-sqs';
import { parse } from "csv-parse";
import { error } from "console";

const region = process.env.AWS_REGION || "us-east-1"; // Default to us-east-1 if not specified

export async function handler(event: S3Event) {
  console.log("Received event:", event);
  const bucketName = process.env.BUCKET_NAME;
  const queueUrl = process.env.SQS_QUEUE_URL;
  
  if (!bucketName) {
    console.error("Bucket name is not specified in environment variables.");
    return;
  }

  const s3Client = new S3Client({ region: region });
  const sqsClient = new SQSClient({ region: region });

  const record = event.Records[0];
  const key = record.s3.object.key;

  try {
    
    const getObjectParams: GetObjectCommandInput = {
      Bucket: bucketName,
      Key: key,
    };

    const getObjectCommand = new GetObjectCommand(getObjectParams);
    const response = await s3Client.send(getObjectCommand);

    if(response.Body instanceof Readable) {
      const s3Stream = response.Body as Readable;

      await new Promise<void>(async (resolve, reject) => {
        const sendMessagePromises: Promise<SendMessageCommandOutput>[] = [];

        s3Stream.pipe(parse())
        .on("data", async (data: Record<string, any>) => {
          console.log("Entry data: ", data);
          const sendMessageCommand = new SendMessageCommand({
            QueueUrl: queueUrl,
            MessageBody: JSON.stringify({ data }),
          });
          
          const sendMessagePromise = sqsClient.send(sendMessageCommand);
          sendMessagePromises.push(sendMessagePromise);

          sendMessagePromise.then(result => {
            console.log('Result: ', result);
          }).catch(error => {
            console.error('Error sending message: ', error);
          }); 

        })
        .on("end", async () => {
          console.log("File processing complete.");
          try {
            await Promise.all(sendMessagePromises);
            resolve();
          } catch (error) {
            reject(error);
          }
        })
        .on("error", (error: Error) => {
          console.error("Error processing file:", error);
          reject(error);
        });
      });
    } else {
      console.error("Unexpected S3 response body type:", typeof response.Body);
    }
  } catch (error) {
    console.error("Error processing S3 event:", error);
  }
}