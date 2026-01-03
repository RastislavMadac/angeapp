import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../enviroment/enviroment';

import { IProductInspection } from '../interface/itemCheck.interface';


@Injectable({
    providedIn: 'root'
})
export class ItemsCheckService {
    private readonly apiUrl = environment.apiUrl;

    constructor(
        private http: HttpClient,
        private router: Router
    ) { }

    // 🔹 Načítanie všetkých objednávok
    loadAllCheck(): Observable<IProductInspection[]> {
        return this.http.get<IProductInspection[]>(`${this.apiUrl}quality-checks/`);
    }

    // Pridaná metóda pre aktualizáciu
    updateCheck(id: number, data: any): Observable<any> {
        return this.http.patch(`${this.apiUrl}quality-checks/${id}/`, data);
    }

    // ...
    createCheck(data: any): Observable<IProductInspection> {
        return this.http.post<IProductInspection>(`${this.apiUrl}quality-checks/`, data);
    }
    // V itemsCheck.service.ts
    searchProducts(query: string): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/products/search/?q=${query}`);
    }

    // Pridaj do ItemsCheckService
    getProductByCode(code: string): Observable<any> {
        return this.http.get<any>(`${this.apiUrl}products/by-code/?code=${code}`);

    }
    // Pridaná metóda pre aktualizáciu
    getExpedition(id: number): Observable<any> {
        return this.http.get(`${this.apiUrl}expedition-items/${id}/`);
    }
}
