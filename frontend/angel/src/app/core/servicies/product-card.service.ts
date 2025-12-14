import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../enviroment/enviroment';
import { ProductionCard } from '../interface/productCard.interface';
import { CheckOrdersResponse } from '../interface/productCard.interface';
@Injectable({
  providedIn: 'root'
})
export class ProductCardService {
  private readonly apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }


  // 🔹 Plány
  loadAllProductCards(): Observable<ProductionCard[]> {
    return this.http.get<ProductionCard[]>(`${this.apiUrl}production-cards/`);
  }
  loadAllMissingOrders(): Observable<CheckOrdersResponse> {
    return this.http.get<CheckOrdersResponse>(`${this.apiUrl}production-cards/check-orderss/`);
  }

  updateProductCard(id: number, data: { produced_quantity: number }): Observable<ProductionCard> {
    return this.http.patch<ProductionCard>(`${this.apiUrl}production-cards/${id}/`, data);
  }


  // Delete product
  deleteProductCard(id: number): Observable<ProductionCard> {
    return this.http.delete<ProductionCard>(`${this.apiUrl}production-cards/${id}/`);
  }

  createProductCard(data: { plan_item_id: number; planned_quantity: number }): Observable<ProductionCard> {
    return this.http.post<ProductionCard>(`${this.apiUrl}production-cards/`, data);
  }


  getPlanItemDetails(planItemId: number): Observable<any> {
    // Použi endpoint pre jednotlivé položky plánu (ProductionPlanItemViewSet)
    return this.http.get<any>(`${this.apiUrl}production-plan-items/${planItemId}/`);
  }


}
