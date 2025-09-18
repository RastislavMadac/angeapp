import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { tap, map } from 'rxjs/operators';
import { TokenService } from './token.service';
import { Observable, of } from 'rxjs';
import { User } from '../interface/user.interface';
import { environment } from '../../../enviroment/enviroment';
import { Product, ProductType, Unit, Category } from '../interface/product.interface';


@Injectable({
    providedIn: 'root'
})


export class ProductService {
    private readonly apiUrl = environment.apiUrl;

    constructor(
        private http: HttpClient,
        private tokenService: TokenService,
        private router: Router

    ) { }

    private product: Product | null = null;

    // Načítanie všetkých používateľov
    loadAllProduct(): Observable<Product[]> {
        return this.http.get<Product[]>(`${this.apiUrl}product/`);
    }
    // UpdateUser
    updateProduct(id: number, productData: any): Observable<Product> {
        return this.http.patch<Product>(`${this.apiUrl}product/${id}/`, productData);
    }


    // CREATE new user
    createProduct(productData: Partial<Product>): Observable<Product> {
        console.log('Sending JSON to API:', productData);
        return this.http.post<Product>(`${this.apiUrl}product/`, productData);
    }
    // Delete product
    deleteProduct(id: number): Observable<Product> {
        return this.http.delete<Product>(`${this.apiUrl}product/${id}/`);
    }

    // Načítanie všetkých typov produktov
    loadAllProductType(): Observable<ProductType[]> {
        return this.http.get<ProductType[]>(`${this.apiUrl}producttype/`);
    }

    updateProductType(id: number, productData: any): Observable<ProductType> {
        return this.http.patch<ProductType>(`${this.apiUrl}producttype/${id}/`, productData);
    }


    createProductType(productData: Partial<ProductType>): Observable<ProductType> {
        return this.http.post<ProductType>(`${this.apiUrl}producttype/`, productData);
    }
    // Delete product
    deleteProductType(id: number): Observable<ProductType> {
        return this.http.delete<ProductType>(`${this.apiUrl}producttype/${id}/`);
    }

    // Načítanie všetkých používateľov
    loadAllUnits(): Observable<Unit[]> {
        return this.http.get<Unit[]>(`${this.apiUrl}unit/`);
    }
    // Načítanie všetkých používateľov
    loadAllCategory(): Observable<Category[]> {
        return this.http.get<Category[]>(`${this.apiUrl}category/`);
    }



}