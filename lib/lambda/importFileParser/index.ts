import { S3Event } from "aws-lambda";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { Readable } from "stream";
import { parse } from "csv-parse";

export async function handler(event: S3Event) {
  const bucketName = process.env.BUCKET_NAME;

  if (!bucketName) {
    console.error("No such bucket within environment variables.");
    return;
  }

  const s3 = new S3Client({ region: "us-east-1" });

  const s3Event = event.Records[0].s3;
  const objectKey = s3Event.object.key;

  try {
    const getObjectCommand = new GetObjectCommand({
      Bucket: bucketName,
      Key: objectKey,
    });

    const response = await s3.send(getObjectCommand);

    if (response.Body instanceof Readable) {
      const s3Stream = response.Body as Readable;

      await new Promise<void>((resolve, reject) => {
        s3Stream
          .pipe(parse({ delimiter: "|" }))
          .on("data", (data: Record<string, string>) => {
            console.log("Record data:", data);
          })
          .on("end", () => {
            console.log("File processing complete.");
            resolve();
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
    console.error("Error retrieving or processing S3 object:", error);
  }
}