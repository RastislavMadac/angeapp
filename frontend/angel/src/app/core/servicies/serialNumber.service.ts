import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { tap, map } from 'rxjs/operators';
import { TokenService } from './token.service';
import { Observable, of } from 'rxjs';
import { User } from '../interface/user.interface';
import { environment } from '../../../enviroment/enviroment';
import { ProductSerialNumber } from '../interface/serialNumber';


@Injectable({
    providedIn: 'root'
})


export class ProductSerialNumberService {
    private readonly apiUrl = environment.apiUrl;

    constructor(
        private http: HttpClient,
        private tokenService: TokenService,
        private router: Router

    ) { }

    private productSerialNumber: ProductSerialNumber | null = null;

    // Načítanie všetkých seriovich cisel
    loadAllProductSerialNumber(): Observable<ProductSerialNumber[]> {
        return this.http.get<ProductSerialNumber[]>(`${this.apiUrl}instance/`);
    }
    // UpdateProductSerialNumber
    updateProductSerialNumber(id: number, productData: any): Observable<ProductSerialNumber> {
        return this.http.patch<ProductSerialNumber>(`${this.apiUrl}instance/${id}/`, productData);
    }


    // CREATE ProductSerialNumber
    createProductSerialNumber(productData: Partial<ProductSerialNumber>): Observable<ProductSerialNumber> {
        console.log('Sending JSON to API:', productData);
        return this.http.post<ProductSerialNumber>(`${this.apiUrl}instance/`, productData);
    }
    // Delete ProductSerialNumber
    deleteProductSerialNumber(id: number): Observable<ProductSerialNumber> {
        return this.http.delete<ProductSerialNumber>(`${this.apiUrl}instance/${id}/`);
    }

}