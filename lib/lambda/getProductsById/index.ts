import * as AWS from 'aws-sdk';
import { AWS_S3 } from '../config';

const s3 = new AWS.S3();

export const handler = async (event: any): Promise<any> => {
    let product;

    try {
        const params = {
            Bucket: AWS_S3.BUCKET_NAME,
            Key: AWS_S3.FILE_KEY,
        };
        // Fetch products from S3 bucket and parse JSON data
        const data = await s3.getObject(params).promise();
        
        if (!data.Body) {
          throw new Error('Product data is empty or unavailable');
        }

        const products = JSON.parse(data.Body.toString('utf-8'));
        product = products.find((p: any) => p.id === event.pathParameters.productId);

    } catch (err) {
        console.error('Error fetching product: ', err);
        
        return {
            statusCode: 404,
            body: JSON.stringify({ error: 'Product not found' }),
            headers: {
                'Content-Type': 'application/json'
            }
        };
    }

    return {
        statusCode: 200,
        body: JSON.stringify(product || { error: 'Product not found' }),
        headers: {
            'Content-Type': 'application/json'
        }
    };
};