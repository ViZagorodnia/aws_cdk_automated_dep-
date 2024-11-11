import { SQSHandler } from "aws-lambda";
import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { PublishCommand, SNSClient } from '@aws-sdk/client-sns';
import { z } from "zod";

const productBodySchema = z.object({
  id: z.string(),
  count: z.number(),
  price: z.number(),
  title: z.string(),
  description: z.string(),
  img: z.string()
});

const dynamoDbClient = new DynamoDBClient({ region: "us-east-1" });
const snsClient = new SNSClient({ region: "us-east-1" });

const tableName = process.env.PRODUCTS_TABLE_NAME;
const stock = process.env.STOCK_TABLE_NAME;
const snsTopicArn = process.env.SNS_TOPIC_ARN;

export const handler: SQSHandler = async (event) => {
  console.log('Event: ',event);
  try {
    for (const record of event.Records) {
      const body = JSON.parse(record.body);
      const data = body.data || [];

      function safelyParseNumber(input: any) {
        const number = Number(input);
        if (isNaN(number)) {
          console.error(`Failed to parse number from input: ${input}`);
          return null;  // Or choose a suitable fallback value, depending on your requirement
        }
        return number;
      }
      
      const count = safelyParseNumber(data[1]);
      const price = safelyParseNumber(data[2]);

      const product = {
        id: data[0],
        count: count,
        price: price,
        title: data[3],
        description: data[4],
        img: data[5]
      };

      const parsedProduct = productBodySchema.parse(product);

      const paramsProducts = {
        TableName: tableName,
        Item: {
          id: { S: parsedProduct.id },
          price: { N: parsedProduct.price.toString() },
          title: { S: parsedProduct.title },
          description: { S: parsedProduct.description },
          img: { S: parsedProduct.img },
        },
      };

      const paramsStock = {
        TableName: stock,
        Item: {
          product_id: { S: parsedProduct.id },
          count: { N: parsedProduct.count.toString() },
        },
      };
      console.log('paramsProducts data: ', paramsProducts)
      console.log('paramsStock data: ', paramsStock)
      
      await dynamoDbClient.send(new PutItemCommand(paramsProducts));
      await dynamoDbClient.send(new PutItemCommand(paramsStock));

      const snsMessage = {
        subject: "New Product Created",
        message: `A new product has been created: ${JSON.stringify(product)}`,
      };

      console.log('snsMessage data: ', snsMessage)
      const publishCommand = new PublishCommand({
        TopicArn: snsTopicArn,
        Message: snsMessage.message,
        Subject: snsMessage.subject,
      });
      const result = await snsClient.send(publishCommand);
      console.log('result: ', result)
    }
  } catch (error) {
    console.error("Error adding products to DynamoDB:", error);
  }
};