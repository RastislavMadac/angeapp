import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { UserService } from '../servicies/user.service';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

export const authGuard: CanActivateFn = (route, state): Observable<boolean> | boolean => {
  const userService = inject(UserService);
  const router = inject(Router);

  if (userService.isLoggedIn()) {
    if (!userService.getUser()) {
      // Ak user ešte nie je načítaný, načítame ho
      return userService.loadCurrentUser().pipe(
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
