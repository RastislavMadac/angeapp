import { OrderItemInterface } from './order-item.interface';

export interface OrderInterface {
    id?: number;
    order_number: string
    customer_id: number;
    customer?: string; // meno zákazníka (len read)
    created_at?: string;
    created_who?: string;
    edited_at?: string;
    edited_who?: string;
    status: string;
    items: OrderItemInterface[];
    total_price?: number;
}
