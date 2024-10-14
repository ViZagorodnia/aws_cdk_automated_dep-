import { S3 } from '@aws-sdk/client-s3';
import { Readable } from 'stream';

const AWS_S3 = {
    BUCKET_NAME: 'deploywebappstack-deploymentfrontendbucket67ceb713-dmeuplpxznej',
    FILE_KEY: 'assets/productList.json'
};

const s3 = new S3({
    region: 'us-east-1'
});

const getStreamData = (stream: Readable): Promise<string> => {
    return new Promise((resolve, reject) => {
        const chunks: Buffer[] = []; // Явное определение типа
        stream.on('data', (chunk: Buffer) => chunks.push(chunk));
        stream.on('error', reject);
        stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    });
};

export const handler = async (): Promise<any> => {
    let products;

    try {
        const params = {
            Bucket: AWS_S3.BUCKET_NAME,
            Key: AWS_S3.FILE_KEY,
        };

        const { Body } = await s3.getObject(params);

        if (!Body) {
            throw new Error('Product data is empty or unavailable');
        }

        if (!(Body instanceof Readable)) {
            throw new Error('Expected Body to be a stream');
        }

        const bodyContents = await getStreamData(Body);
        products = JSON.parse(bodyContents);

    } catch (err) {
        console.error('Error fetching products: ', err);

        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Failed to load product data' }),
            headers: {
                'Content-Type': 'application/json'
            }
        };
    }

    return {
        statusCode: 200,
        headers: {
            "Access-Control-Allow-Headers" : "Content-Type",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
        },
        body: JSON.stringify(products || { error: 'Product not found' }),
    };
};