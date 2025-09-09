import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../auth.service';

export const roleGuard: CanActivateFn = (route, state) => {
    const authService = inject(AuthService);
    const router = inject(Router);

    // ak nie je prihlásený → presmeruj na login
    if (!authService.isLoggedIn()) {
        return router.parseUrl('/login');
    }

    // ak nie je admin → presmeruj napr. na dashboard
    if (!authService.isAdmin()) {
        return router.parseUrl('/dashboard');
    }

    // je admin → vpusti ho na route
    return true;
};
