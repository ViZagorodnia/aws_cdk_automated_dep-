const { S3 } = require('@aws-sdk/client-s3');
const AWS_S3 = {
    BUCKET_NAME: 'deploywebappstack-deploymentfrontendbucket67ceb713-dmeuplpxznej ',
    FILE_KEY: 'assets/productList.json'
};

const s3 = new S3({
    region: 'us-east-1'
});

export const handler = async (): Promise<any> => {
    let products;

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

        products = JSON.parse(data.Body.toString('utf-8'));

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
        body: JSON.stringify(products || { error: 'Product not found' }),
        headers: {
            'Content-Type': 'application/json'
        }
    };
};