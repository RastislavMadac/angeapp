import { Injectable } from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class TokenService {

    private readonly TOKEN_KEY = 'auth_token';

    constructor() { }

    setToken(token: string): void {
        sessionStorage.setItem(this.TOKEN_KEY, token);
    }

    getToken(): string | null {
        return sessionStorage.getItem(this.TOKEN_KEY);
    }

    removeToken(): void {
        sessionStorage.removeItem(this.TOKEN_KEY);
    }
}
