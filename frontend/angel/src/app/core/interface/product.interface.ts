export interface Category {
    id: number;
    name: string;
}

export interface Unit {
    id: number;
    name: string;
    short_name: string;
}

export interface ProductType {
    id: number;
    name: string;
    description: string;
}

export interface Product {
    id: number;
    product_id: string;
    internet_id: string;
    category: number;          // ID
    category_name: string;     // názov
    unit: number;              // ID
    unit_name: string;         // názov
    product_type: number;      // ID
    product_type_name: string; // názo
    is_serialized: boolean;
    product_name: string;
    description: string;
    weight_item: string | number;   // môže prísť zo servera ako string, ale použiť ako number
    internet: boolean;
    ean_code: string;
    qr_code: string;
    price_no_vat: string | number;  // podobne
    total_quantity: number;
    reserved_quantity: number;
    free_quantity: number;
    created_by: number;
    created_at: string;   // ISO dátum
    updated_at: string;
    updated_by: number;
}
