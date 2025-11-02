import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../enviroment/enviroment';
import { ProductPlanInterface } from '../interface/productPlan.interface';
import { ProductPlanItemsInterface } from '../interface/productPlan.interface';
import { ProductPlanProductsInterface } from '../interface/productPlan.interface';



@Injectable({
    providedIn: 'root'
})
export class ProductPlanService {
    private readonly apiUrl = environment.apiUrl;

    constructor(private http: HttpClient) { }

    // 🔹 Plány
    loadAllProductPlans(): Observable<ProductPlanInterface[]> {
        return this.http.get<ProductPlanInterface[]>(`${this.apiUrl}production-plans/`);
    }

    createPlan(planData: Partial<ProductPlanInterface>): Observable<ProductPlanInterface> {
        return this.http.post<ProductPlanInterface>(`${this.apiUrl}production-plans/`, planData);
    }

    updatePlan(id: number, planData: Partial<ProductPlanInterface>): Observable<ProductPlanInterface> {
        return this.http.patch<ProductPlanInterface>(`${this.apiUrl}production-plans/${id}/`, planData);
    }

    // 🔹 Položky
    createItemPlan(itemData: Partial<ProductPlanProductsInterface>): Observable<ProductPlanProductsInterface> {
        return this.http.post<ProductPlanProductsInterface>(`${this.apiUrl}production-plan-items/`, itemData);
    }
    // 🔹 Položky
    loadItemPlans(): Observable<ProductPlanProductsInterface[]> {
        return this.http.get<ProductPlanProductsInterface[]>(`${this.apiUrl}production-plan-items/`);
    }

    updateItemPlan(id: number, itemData: Partial<ProductPlanProductsInterface>): Observable<ProductPlanProductsInterface> {
        return this.http.patch<ProductPlanProductsInterface>(`${this.apiUrl}production-plan-items/${id}/`, itemData);
    }

    // 🔹 Produkty pre plány
    loadAllProductForPlans(): Observable<ProductPlanItemsInterface[]> {
        return this.http.get<ProductPlanItemsInterface[]>(`${this.apiUrl}productForProductPlan/`);
    }

    loadAllProductForPlansSearch(query: string): Observable<ProductPlanItemsInterface[]> {
        // 💡 Použijeme query parameter 'search' pre filtrovanie produktov
        const url = `${this.apiUrl}productForProductPlan/?search=${query}`;

        return this.http.get<ProductPlanItemsInterface[]>(url);
    }

    // Delete product
    deleteProductForPlans(id: number): Observable<ProductPlanProductsInterface> {
        return this.http.delete<ProductPlanProductsInterface>(`${this.apiUrl}production-plan-items/${id}/`);
    }
}
