import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { tap, map } from 'rxjs/operators';
import { TokenService } from './token.service';
import { Observable, of } from 'rxjs';

import { environment } from '../../../enviroment/enviroment';
import { CustomersInterface } from '../interface/customer.interface';


@Injectable({
    providedIn: 'root'
})


export class CustomerService {
    private readonly apiUrl = environment.apiUrl;

    constructor(
        private http: HttpClient,
        private tokenService: TokenService,
        private router: Router

    ) { }

    private customer: CustomersInterface | null = null;

    // Načítanie všetkých používateľov
    loadAllCustomers(): Observable<CustomersInterface[]> {
        return this.http.get<CustomersInterface[]>(`${this.apiUrl}customers/`);
    }
    // UpdateUser
    updateCustomer(id: number, customerData: any): Observable<CustomersInterface> {
        console.log('update JSON to API:', customerData);
        return this.http.patch<CustomersInterface>(`${this.apiUrl}customers/${id}/`, customerData);
    }


    // CREATE new user
    createCustomer(customerData: Partial<CustomersInterface>): Observable<CustomersInterface> {
        console.log('Sending JSON to API:', customerData);
        return this.http.post<CustomersInterface>(`${this.apiUrl}customers/`, customerData);
    }
    // Delete product
    deletecustomer(id: number): Observable<CustomersInterface> {
        return this.http.delete<CustomersInterface>(`${this.apiUrl}customers/${id}/`);
    }





}