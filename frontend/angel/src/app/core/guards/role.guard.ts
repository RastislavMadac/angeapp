import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { UserService } from '../servicies/user.service';

export const roleGuard: CanActivateFn = (route, state) => {
    const userService = inject(UserService);
    const router = inject(Router);

    // ak nie je prihlásený → presmeruj na login
    if (!userService.isLoggedIn()) {
        return router.parseUrl('/login');
    }

    // ak nie je admin → presmeruj napr. na dashboard
    if (!userService.isAdmin()) {
        return router.parseUrl('/dashboard');
    }

    // je admin → vpusti ho na route
    return true;
};
