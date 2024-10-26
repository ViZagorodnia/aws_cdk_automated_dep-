import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { createProductHandler } from './createProduct/index';
import { getProductsByIdHandler } from './getProductsById/index';
import { getProductsListHandler } from './getProductsList/index';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
        switch (event.httpMethod) {
            case 'GET':
                if (event.pathParameters && event.pathParameters.productId) {
                    // Передаємо обробку запиту на отримання конкретного продукту
                    return getProductsByIdHandler(event);
                } else {
                    // Передаємо обробку запиту на отримання списку всіх продуктів
                    return getProductsListHandler(event);
                }
            case 'POST':
                // Передаємо обробку запиту на створення нового продукту
                return createProductHandler(event);
            default:
                // Повертаємо помилку, якщо HTTP метод не підтримується
                return {
                    statusCode: 405,
                    body: JSON.stringify({ message: 'Method Not Allowed' }),
                    headers: {
                        "Content-Type": "application/json"
                    }
                };
        }
    } catch (error: unknown) {
        // Якщо помилка є екземпляром Error, використовуємо її message
        if (error instanceof Error) {
            console.error('Error:', error.message);
            return {
                statusCode: 500,
                body: JSON.stringify({ message: 'Internal Server Error', details: error.message }),
                headers: {
                    "Content-Type": "application/json"
                }
            };
        } else {
            // Якщо невідомий тип помилки, відправляємо загальне повідомлення
            return {
                statusCode: 500,
                body: JSON.stringify({ message: 'Internal Server Error' }),
                headers: {
                    "Content-Type": "application/json"
                }
            };
        }
    }
};