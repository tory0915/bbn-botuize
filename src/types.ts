export interface User {
  email: string;
  name: string;
  role: 'user' | 'admin';
  createdAt: string;
}

export interface Product {
  id?: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  imageUrls?: string[]; // Array for multiple images
  sizes: string[];
  isActive: boolean;
  createdAt: string;
}

export interface OrderItem {
  productId: string;
  name: string;
  size: string;
  quantity: number;
  price: number;
}

export interface Order {
  id?: string;
  userId: string;
  items: OrderItem[];
  totalAmount: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered';
  shippingInfo?: {
    recipientName: string;
    phone: string;
    zipCode: string;
    address: string;
    detailAddress: string;
  };
  createdAt: string;
  updatedAt: string;
}
