// types.ts
export interface Product {
  productId: string;
  count: number;
  description: string;
  price: number;
  title: string;
  img: string;
}

export interface StockItem {
  product_id: string;
  count: number;
}
