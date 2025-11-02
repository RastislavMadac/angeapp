export interface ProductPlanInterface {
    is_serialized(is_serialized: any): boolean;

    id: number;
    plan_number: string;
    plan_type: 'monthly' | 'weekly';
    start_date: string;       // ISO dátum
    end_date: string;         // ISO dátum
    items: {
        id: number;
        production_plan: number;
        product: number;
        product_id: String;
        product_name: string;
        planned_quantity: number;
        planned_date: string;   // ISO dátum
        status: 'pending' | 'in_production' | 'partially completed' | 'completed' | 'canceled';
        production_card?: any | null;
        ingredients_status: {
            ingredient: string;
            required_qty: number;
            available_qty: number;
            is_sufficient: boolean;
        }[];
        transfered_pcs: number;
    }[];
    created_at: string;       // ISO datetime
    created_by?: number;
    created_by_name?: string;
    updated_at: string;       // ISO datetime
    updated_by?: number;
    updated_by_name?: string;
}



export interface ProductPlanItemsInterface {
    id: number;
    product_id: string;
    product_name: string;
    description: string;
    product_type: number;   // ID typu produktu
    unit: number;           // ID jednotky
    category: number;       // ID kategórie
    weight_item: string;    // môže byť string, lebo prichádza z backendu ako "0.600"
    price_no_vat: string;   // string kvôli presnosti (napr. "499.99")
    tax_rate: string;       // string kvôli presnosti
    total_quantity: number;
    reserved_quantity: number;
    free_quantity: number;
    minimum_on_stock: number;
    is_serialized: boolean;
}

export interface ProductPlanProductsInterface {
    id: number;
    production_plan: number;   // ID nadradeného plánu
    product: number;           // ID produktu
    product_name: string;
    planned_quantity: number;
    planned_date: string;      // ISO dátum, napr. "2025-10-01"
    status: 'pending' | 'in_production' | 'partially completed' | 'completed' | 'canceled';
    production_card?: any | null;
    transfered_pcs: number;
}

export type ProductPlanItemForm = ProductPlanProductsInterface & {
    product_id: string | null; // ⬅️ Kód produktu (LEN pre UI a vyhľadávanie)
};