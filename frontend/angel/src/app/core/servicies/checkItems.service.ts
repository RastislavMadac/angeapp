import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../enviroment/enviroment';

@Injectable({
    providedIn: 'root'
})
export class ProductValidationService {
    private apiUrl = environment.apiUrl;

    constructor(private http: HttpClient) { }

    /**
     * Overí, či sériové číslo už existuje v databáze.
     * @param serial_number Sériové číslo na kontrolu
     * @returns Observable s objektom { exists: boolean }
     */
    // product-validation.service.ts

    checkSnUnique(serial_number: string): Observable<{ exists: boolean }> {
        // DÔLEŽITÉ: Používame POST a lomeno na konci (trailing slash), ktoré Django vyžaduje
        return this.http.post<{ exists: boolean }>(
            `${this.apiUrl}check-serial-number/`,
            { serial_number }
        );
    }
}