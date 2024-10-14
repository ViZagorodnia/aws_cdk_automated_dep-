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
        let data = '';
        stream.on('data', chunk => data += chunk);
        stream.on('error', err => reject(err));
        stream.on('end', () => resolve(data));
    });
};

export const handler = async (event: any): Promise<any> => {
    let product;

    try {
        const params = {
            Bucket: AWS_S3.BUCKET_NAME,
            Key: AWS_S3.FILE_KEY
        };

        const { Body } = await s3.getObject(params);

        if (!Body) {
            throw new Error('Product data is empty or unavailable');
        }
        
        if (!(Body instanceof Readable)) {
            throw new Error('Expected Body to be a Readable stream');
        }

        const bodyContents: string = await getStreamData(Body);
        const products = JSON.parse(bodyContents);
        product = products.find((p: any) => p.productId === event.pathParameters.productId);

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
        headers: {
            "Access-Control-Allow-Headers" : "Content-Type",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
        },
        body: JSON.stringify(product || { error: 'Product not found' }),
    };
};