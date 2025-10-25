import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../enviroment/enviroment';
import { ProductPlanInterface } from '../interface/productPlan.interface';
import { ProductPlanItemsInterface } from '../interface/productPlan.interface';

@Injectable({
    providedIn: 'root'
})
export class ProductPlanService {
    private readonly apiUrl = environment.apiUrl;

    constructor(
        private http: HttpClient,
        private router: Router
    ) { }

    // 🔹 Načítanie všetkých výrobných plánov
    loadAllProductPlans(): Observable<ProductPlanInterface[]> {
        return this.http.get<ProductPlanInterface[]>(`${this.apiUrl}production-plans/`);
    }
}