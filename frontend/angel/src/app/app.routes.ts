import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';
import { LayoutComponent } from './layout.component';

export const routes: Routes = [
    {
        path: '',
        component: LayoutComponent, // namiesto AppComponent
        canActivateChild: [authGuard],
        children: [
            {
                path: 'dashboard',
                loadComponent: () =>
                    import('./core/components/dashboard/dashboard.component')
                        .then(m => m.DashboardComponent),
            },
            {
                path: 'users',
                canActivate: [roleGuard],
                loadComponent: () =>
                    import('./core/components/users/users.component')
                        .then(m => m.UsersComponent),
            },
            { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
            {
                path: 'products',
                // canActivate: [roleGuard],
                loadComponent: () =>
                    import('./core/components/product/product.component')
                        .then(m => m.ProductComponent),
            },
            { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
        ],
    },
    {
        path: 'login',
        loadComponent: () =>
            import('./auth/login/login.component').then(m => m.LoginComponent),
    },
    { path: '**', redirectTo: 'login' },
];
