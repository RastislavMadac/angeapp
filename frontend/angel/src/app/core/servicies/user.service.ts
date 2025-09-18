import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { tap, map } from 'rxjs/operators';
import { TokenService } from './token.service';
import { Observable, of } from 'rxjs';
import { User } from '../interface/user.interface';
import { environment } from '../../../enviroment/enviroment';


@Injectable({
    providedIn: 'root'
})
export class UserService {
    private readonly apiUrl = environment.apiUrl;

    private user: User | null = null;


    /** Získaj rolu aktuálneho používateľa */
    getRole(): string | null {
        return this.user?.role ?? null;
    }

    isAdmin(): boolean {
        return this.getRole() === 'admin';
    }

    constructor(
        private http: HttpClient,
        private tokenService: TokenService,
        private router: Router

    ) { }




    /** Prihlásenie používateľa */

    login(credentials: { username: string; password: string }): Observable<{ token: string }> {

        return this.http.post<{ token: string }>(this.apiUrl + 'login/', credentials).pipe(

            tap(res => {

                this.tokenService.setToken(res.token);

                // this.loadCurrentUser().subscribe(); // načíta info o používateľovi po prihlásení 

            })

        );
    }

    logout() {
        this.tokenService.removeToken();
        this.user = null;
        this.router.navigate(['/login']);
    }

    isLoggedIn(): boolean {
        return !!this.tokenService.getToken();
    }

    // Načítanie info o aktuálnom používateľovi podľa tokenu (endpoint musí byť backendom zabezpečený)
    loadCurrentUser(): Observable<any> {
        console.log('Volám loadCurrentUser()');
        return this.http.get<any>(this.apiUrl + 'current-user/').pipe(
            tap({
                next: user => {
                    console.log('Načítaný user:', user);
                    // console.log je tu bezpečný, dáta už existujú
                    console.log('ID:', user.id, 'Username:', user.username); // ←
                    this.user = user;
                },
                error: err => {
                    console.error('Chyba pri loadCurrentUser():', err);
                    this.user = null; // alebo fallback
                }
            })
        );
    }

    getUser() {
        return this.user;
    }

    // Načítanie všetkých používateľov
    loadAllUsers(): Observable<User[]> {
        return this.http.get<User[]>(`${this.apiUrl}users/`);
    }


    // UpdateUser

    updateUser(id: number, userData: any): Observable<User> {
        return this.http.patch<User>(`${this.apiUrl}users/${id}/`, userData);
    }


    // CREATE new user
    createUser(userData: Partial<User>): Observable<User> {
        console.log('Sending JSON to API:', userData);
        return this.http.post<User>(`${this.apiUrl}users/`, userData);
    }
    // Delete user
    deleteUser(id: number): Observable<User> {
        return this.http.delete<User>(`${this.apiUrl}users/${id}/`);
    }

}