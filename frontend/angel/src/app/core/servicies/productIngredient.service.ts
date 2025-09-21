import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { tap, map } from 'rxjs/operators';
import { TokenService } from './token.service';
import { Observable, of } from 'rxjs';
import { ProductIngredient } from '../interface/productIngredient';
import { environment } from '../../../enviroment/enviroment';
import { Product } from '../interface/product.interface';

@Injectable({
    providedIn: 'root'
})
export class ProductIngredientService {
    private readonly apiUrl = environment.apiUrl;

    constructor(private http: HttpClient) { }

    //  -----------------------
    //  výrobok 
    //  -----------------------
    // Načítanie všetkých ingrediencií (prípadne filtrované podľa produktu)
    loadAllProduct(productId?: number): Observable<Product[]> {
        let url = `${this.apiUrl}manufacture/`;
        if (productId) {
            url += `?product_id=${productId}`;
        }
        return this.http.get<Product[]>(url);
    }

    // Vytvorenie novej ingrediencie
    createIngredient(ingredientData: Partial<ProductIngredient>): Observable<ProductIngredient> {
        console.log('Sending JSON to API:', ingredientData);
        return this.http.post<ProductIngredient>(`${this.apiUrl}manufacture/`, ingredientData);
    }



    //  -----------------------
    //  Ingerdiencie
    //  -----------------------
    // Načítanie ingrediencií pre vybraný produkt
    loadIngredients(productId?: number): Observable<ProductIngredient[]> {
        const url = `${this.apiUrl}ingredience/?product_id=${productId}`;
        return this.http.get<ProductIngredient[]>(url);
    }

    // Vytvorenie novej ingrediencie
    createIngredientManufacture(ingredientData: Partial<ProductIngredient>): Observable<ProductIngredient> {
        return this.http.post<ProductIngredient>(`${this.apiUrl}ingredience/`, ingredientData);
    }

    // Aktualizácia existujúcej ingrediencie
    updateIngredient(id: number, ingredientData: Partial<ProductIngredient>): Observable<ProductIngredient> {
        return this.http.patch<ProductIngredient>(`${this.apiUrl}ingredience/${id}/`, ingredientData);
    }

    // Odstránenie ingrediencie
    deleteIngredient(id: number): Observable<any> {
        return this.http.delete(`${this.apiUrl}ingredience/${id}/`);
    }



}