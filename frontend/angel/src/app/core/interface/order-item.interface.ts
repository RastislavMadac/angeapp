export interface OrderItemInterface {
    id?: number;
    product_code?: number;
    product_id: number;
    product?: string; // názov produktu z backendu (len read)
    quantity: number;
    price: number;
    total_price?: number; // vypočíta backend

}
