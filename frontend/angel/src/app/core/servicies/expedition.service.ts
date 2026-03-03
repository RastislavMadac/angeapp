import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../enviroment/enviroment';
import { IExpedition } from '../interface/expedition.interface';


@Injectable({
    providedIn: 'root'
})
export class ExpeditionService {
    private readonly apiUrl = environment.apiUrl;

    constructor(
        private http: HttpClient,
        private router: Router
    ) { }

    // 🔹 Načítanie všetkých objednávok
    loadAllExpeditions(): Observable<IExpedition[]> {
        return this.http.get<IExpedition[]>(`${this.apiUrl}expeditions/`);
    }
    createExpedition(data: Partial<IExpedition>): Observable<IExpedition> {
        // Posielame POST na vytvorenie nového záznamu
        return this.http.post<IExpedition>(`${this.apiUrl}expeditions/`, data);
    }

    getExpedition(id: number): Observable<IExpedition> {
        // Django REST framework vyžaduje lomku na konci (trailing slash)
        return this.http.get<IExpedition>(`${this.apiUrl}expeditions/${id}/`);
    }


    deleteItem(expeditionId: number, itemId: number): Observable<void> {
        // Django REST framework zvyčajne vyžaduje koncové lomky (trailing slashes)
        const url = `${this.apiUrl}expeditions/${expeditionId}/delete-item/${itemId}/`;

        return this.http.delete<void>(url);
    }


    patchExpedition(id: number, data: Partial<IExpedition>): Observable<IExpedition> {
        return this.http.patch<IExpedition>(`${this.apiUrl}expeditions/${id}/`, data);
    }

    assignSerial(payload: { expedition: number, order_item: number, serial_number: string }): Observable<any> {
        // Predpokladám, že URL máš namapovanú napr. na 'expeditions/assign-serial/'
        return this.http.post(`${this.apiUrl}expeditions/assign-serial/`, payload);
    }
    updateItemQuantity(itemId: number, quantity: number): Observable<any> {
        return this.http.patch(`${this.apiUrl}expedition-items/${itemId}/`, { quantity: quantity });
    }


}