export type DefectStatus = 'ok' | 'error' | 'none';

export interface IProductInspection {
    id: number;
    product_instance_id: number;

    // --- Polia pre CREATE (Django input) ---
    product_id?: number;           // Django PrimaryKeyRelatedField
    serial_number?: string;        // Django CharField (write_only)

    // --- Polia pre READ (Django output) ---
    instance_serial_number: string;
    product_name: string;

    manufacture_date: string;
    manufactured_by: number;
    visual_check: boolean;
    packaging_check: boolean;
    defect_status: DefectStatus;
    defect_description: string;
    checked_by: string;
    checked_at: string;
    approved_for_shipping: boolean;
    created_at: string;
    updated_at: string;
}