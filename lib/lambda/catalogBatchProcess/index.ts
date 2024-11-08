import { v4 as uuidv4 } from "uuid";
import { SQSHandler } from "aws-lambda";
import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { PublishCommand, SNSClient } from "@aws-sdk/client-sns";
import { z } from "zod";
import { Product } from "../createProduct/types";

const dynamoDbClient = new DynamoDBClient({ region: "us-east-1" });
const snsClient = new SNSClient({ region: "us-east-1" });

const tableName = process.env.PRODUCTS_TABLE_NAME;
const snsTopicArn = process.env.SNS_TOPIC_ARN;

const productSchema = z.object({
  count: z.number(),
  price: z.number(),
  title: z.string(),
  description: z.string(),
  img: z.string(),
});

export const handler: SQSHandler = async (event) => {
  try {
    for (const record of event.Records) {
      const productData: Product = JSON.parse(record.body);

      // product validation
      const product = productSchema.parse(productData);

      const params = {
        TableName: tableName,
        Item: {
          id: { S: uuidv4() },
          createdAt: { N: new Date().getTime().toFixed() },
          count: { N: product.count.toString() },
          price: { N: product.price.toString() },
          title: { S: product.title },
          description: { S: product.description },
          img: { S: "https://d2b4ydf5lv1f0v.cloudfront.net/assets/images/1.jpg" },
        },
      };

      await dynamoDbClient.send(new PutItemCommand(params));

      const snsMessage = {
        subject: "New Product was created",
        message: `A new product has been created: ${JSON.stringify(product)}`,
      };

      await snsClient.send(new PublishCommand({
        TopicArn: snsTopicArn,
        Message: snsMessage.message,
        Subject: snsMessage.subject,
      }));
    }
  } catch (error) {
    console.error("Error adding products to DynamoDB:", error);
  }
};