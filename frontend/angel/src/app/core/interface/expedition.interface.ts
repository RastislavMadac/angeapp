// expedition.interface.ts

/** * Položka expedície (to, čo sa zobrazuje v zozname naskenovaných kusov) 
 * Používa sa pri mazaní: expeditions/{{expedition_id}}/delete-item/{{item.id}}/
 */
export interface IExpeditionItem {
    id: number;
    order_item: number;
    product_instance: number | null;
    product_instance_serial?: string | null;
    product_name: string;
    unit_price: string;
    stock_issue_item: number | null;
    quantity: number;
    isCorrect?: boolean;
    is_serialized: boolean;
    temp_sn_value?: string;
    is_sn_validated?: boolean;
    product_id: number;
    temp_quantity?: number;
    product_code?: string;
}

/** Pomocné informácie o tom, čo ešte treba naskenovať */
export interface IPreparedItem {
    order_item: number;
    product_name: string;
    unit_price: number;
    product_instance: number | null;
    quantity?: number;

}

/** Hlavný objekt Expedície */
export interface IExpedition {
    id: number;
    expedition_number: string;
    order: number;
    order_number: string;
    status: 'draft' | 'ready' | 'shipped';
    closed_at: string | null;
    items: IExpeditionItem[];
    prepared_items: IPreparedItem[];
    stock_issue: number | null;

}

// export interface IExpedition {
//     id: number;
//     order: number;
//     order_number: string;
//     status: 'draft' | 'ready' | 'shipped';
//     closed_at: string | null;
//     stock_issue: number | null;

//     // Pole už existujúcich položiek v expedícii
//     items: Array<{
//         id: number;
//         order_item: number;
//         product_instance: number | null;
//         product_instance_serial?: string | null; // Optional, lebo pri klávesnici chýba
//         product_name: string;
//         unit_price: string; // Backend posiela "0.00"
//         stock_issue_item: number | null;
//         quantity: number;
//     }>;

//     // Pole položiek pripravených na expedíciu (zobrazovacie účely)
//     prepared_items: Array<{
//         order_item: number;
//         product_name: string;
//         unit_price: number; // Backend posiela 0.0 (nie string!)
//         product_instance: number | null;
//         quantity?: number; // Optional, lebo pri tabletoch chýba
//     }>;
// }