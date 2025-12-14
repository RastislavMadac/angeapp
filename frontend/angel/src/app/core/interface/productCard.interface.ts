export type ProductionStatus = 'pending' | 'in_progress' | 'partially_completed' | 'completed' | 'canceled';


export interface ProductionCard {
  id: number;
  card_number: string;
  product_name: string;
  plan_item_name: string;
  production_plan_number: string;
  production_plan_item_id?: number | null;

  // Množstvá
  planned_quantity: number;
  produced_quantity: number;
  defective_quantity: number;
  remaining_quantity: number;

  status: ProductionStatus;


  // Nullable polia (môžu byť null)
  operator: number | null;
  operator_name: string | null;
  start_time: string | null;
  end_time: string | null;
  notes: string | null;

  stock_receipt_created: boolean;

  // Audit polia
  created_at: string;
  created_by: number;
  updated_at: string;
  updated_by: number;

}

// 1. Interface pre jednotlivé varovanie (položku v poli)
export interface ProductionWarning {
  product_id: number;
  product_name: string;
  ordered: number;       // Koľko zákazník objednal
  planned: number;       // Koľko je vo výrobe
  missing: number;       // Rozdiel (ordered - planned)
  order_id: number;
  order_number: string;
  customer_name: string;
}

// 2. Interface pre celú odpoveď z API
export interface CheckOrdersResponse {
  total_warnings: number;
  warnings: ProductionWarning[];
}