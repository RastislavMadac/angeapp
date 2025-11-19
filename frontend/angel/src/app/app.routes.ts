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
            {
                path: 'serialNumber',
                // canActivate: [roleGuard],
                loadComponent: () =>
                    import('./core/components/serial-number/serial-number.component')
                        .then(m => m.SerialNumberComponent),
            },
            {
                path: 'ingredient',
                // canActivate: [roleGuard],
                loadComponent: () =>
                    import('./core/components/ingredient/ingredient.component')
                        .then(m => m.ProductIngredientComponent),
            },
            {
                path: 'customers',
                // canActivate: [roleGuard],
                loadComponent: () =>
                    import('./core/components/customers/customers.component')
                        .then(m => m.CustomersComponent),
            },
            {
                path: 'orders',
                // canActivate: [roleGuard],
                loadComponent: () =>
                    import('./core/components/orders/orders.component')
                        .then(m => m.OrdersComponent),
            },
            {
                path: 'productPlan',
                // canActivate: [roleGuard],
                loadComponent: () =>
                    import('./core/components/product-plan/product-plan.component')
                        .then(m => m.ProductPlanComponent),
            },
            {
                path: 'testComponent',
                canActivate: [roleGuard],
                loadComponent: () =>
                    import('./core/components/test/test.component')
                        .then(m => m.TestComponent),
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
