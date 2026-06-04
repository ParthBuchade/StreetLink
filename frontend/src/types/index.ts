export interface Product {
  id: string;
  name: string;
  description: string;
  address: string;
  city: string;
  mobileNo: string;
  countryCode: string;
  price: number;
  minOrder: number;
  quantity: number;
  imageUrl: string;
  wholesalerId: string;
  wholesalerName?: string;
  wholesalerPhoto?: string;
}

export interface ChatMessage {
  id: string;
  message: string;
  isBot: boolean;
  timestamp: Date;
  products?: Product[];
}

export interface CounterOffer {
  price: number;
  quantity: number;
  byWholesaler: string;
  wholesalerName: string;
  wholesalerId: string;
  at: Date;
}

// src/types/index.ts
export interface BidRequest {
  id: string;
  vendorId: string;
  vendorName: string;
  vendorEmail: string;
  productName: string;
  description: string;
  quantity: number;
  bidPrice: number;
  urgency: 'immediate' | 'today' | 'tomorrow' | 'this_week';
  location: string;
  status: 'pending' | 'accepted' | 'rejected' | 'completed' | 'order_placed' | 'counter_accepted' | 'counter_rejected';
  createdAt: Date;
  acceptedBy?: string;
  acceptedAt?: Date;
  wholesalerName?: string;
  wholesalerContact?: string;
  orderId?: string;
  orderPlacedAt?: Date;
  counterOffer?: CounterOffer;       // set by wholesaler when sending counter
  counterRespondedAt?: Date;         // set by vendor when accepting/rejecting counter
}

export interface Order {
  id: string;
  bidRequestId: string;
  productName: string;
  quantity: number;
  pricePerUnit: number;
  totalAmount: number;
  vendorId: string;
  vendorName: string;
  wholesalerId: string;
  wholesalerName: string;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
  createdAt: Date;
  deliveryAddress?: string;
  estimatedDelivery?: Date;
}
