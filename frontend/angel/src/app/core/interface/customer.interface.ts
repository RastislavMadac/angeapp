export interface CustomersInterface {
    id: number;
    internet_id?: string;
    name: string;
    address: string;
    postal_code?: string;
    city?: string;

    delivery_address?: string;
    delivery_city?: string;
    delivery_postal_code?: string;

    is_legal_entity?: boolean;
    ico?: string;
    dic?: string;
    ic_dph?: string;

    phone?: string;
    email?: string;
    website?: string;

    // Meta polia (ak ich používaš v zozname alebo API)
    created_at?: string;
    updated_at?: string;
    created_by?: number;
    updated_by?: number;
}
