import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../auth.service';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

export const authGuard: CanActivateFn = (route, state): Observable<boolean> | boolean => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isLoggedIn()) {
    if (!authService.getUser()) {
      // Ak user ešte nie je načítaný, načítame ho
      return authService.loadCurrentUser().pipe(
        map(user => true),
        catchError(() => {
          router.navigate(['/login']);
          return of(false);
        })
      );
    }
    return true;
  } else {
    router.navigate(['/login']);
    return false;
  }
};
