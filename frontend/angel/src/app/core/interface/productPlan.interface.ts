export interface ProductPlanInterface {

    id: number;
    plan_number: string;
    plan_type: 'monthly' | 'weekly';
    start_date: string;       // ISO dátum
    end_date: string;         // ISO dátum
    items: {
        id: number;
        production_plan: number;
        product: number;
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



export interface ProductPlanItemsInterface { }