import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../enviroment/enviroment';

import { OrderInterface } from '../interface/order.interface';
import { OrderItemInterface } from '../interface/order-item.interface';

@Injectable({
    providedIn: 'root'
})
export class OrderService {
    private readonly apiUrl = environment.apiUrl;

    constructor(
        private http: HttpClient,
        private router: Router
    ) { }

    // 🔹 Načítanie všetkých objednávok
    loadAllOrders(): Observable<OrderInterface[]> {
        return this.http.get<OrderInterface[]>(`${this.apiUrl}orders/`);
    }

    // 🔹 Detail objednávky
    getOrder(id: number): Observable<OrderInterface> {
        return this.http.get<OrderInterface>(`${this.apiUrl}orders/${id}/`);
    }

    // 🔹 Vytvorenie objednávky
    createOrder(orderData: Partial<OrderInterface>): Observable<OrderInterface> {
        console.log('POST Order JSON:', orderData);
        return this.http.post<OrderInterface>(`${this.apiUrl}orders/`, orderData);
    }

    getProductByCode(code: string) {
        return this.http.get<{
            id: number,
            name: string,
            product_id: string,
            price: number
        }>(`${this.apiUrl}products/by-code/?code=${code}`)
            .pipe(
                tap(product => console.log('Načítaný produkt z API:', product))
            );
    }


    // 🔹 Update objednávky (PATCH)
    updateOrder(id: number, orderData: Partial<OrderInterface>): Observable<OrderInterface> {
        console.log('PATCH Order JSON:', orderData);
        return this.http.patch<OrderInterface>(`${this.apiUrl}orders/${id}/`, orderData);
    }

    // 🔹 Zmazanie objednávky
    deleteOrder(id: number): Observable<any> {
        return this.http.delete(`${this.apiUrl}orders/${id}/`);
    }

    // 🔹 Načítanie všetkých objednávok
    loadAllItemOrders(): Observable<OrderItemInterface[]> {
        return this.http.get<OrderItemInterface[]>(`${this.apiUrl}order-items/`);
    }
}
