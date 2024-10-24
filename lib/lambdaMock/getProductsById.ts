import { mockProducts } from "./mockProductList";

export async function main(event: { pathParameters: { productId: string } }) {
    const { productId } = event.pathParameters;
  
    const product = mockProducts.find((p) => p.id === productId);
  
    return product;
  }