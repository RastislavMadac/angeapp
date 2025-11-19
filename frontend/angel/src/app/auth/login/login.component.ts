import { Component } from '@angular/core';

import { Router } from '@angular/router';
import { UserService } from '../../core/servicies/user.service';
import { NotificationService } from '../../core/servicies/notification.service';

import { NotificationCenterComponent } from '../../core/components/notification-center/notification-center.component';
import { NgIf } from '@angular/common';
import { FormControl, FormGroup, FormsModule } from '@angular/forms';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule], // FormsModule namiesto ReactiveFormsModule
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  username = '';
  password = '';


  constructor(
    private userService: UserService,
    private router: Router,
    private notify: NotificationService) { }

  updateuUser() {
    this.username = 'rasto';
    this.password = 'Rastislav1982@';
  }



  // onSubmit() {
  //   if (!this.username || !this.password) {
  //     this.errorMessage = 'Zadajte používateľské meno a heslo.';
  //     return;
  //   }

  //     this.userService.login({ username: this.username, password: this.password }).subscribe({
  //       next: (res: any) => {
  //         // Predpokladám, že `res` obsahuje token v res.token
  //         localStorage.setItem('token', res.token);  // Uloženie tokenu
  //         this.router.navigate(['/dashboard']);      // Navigácia po uložení tokenu
  //       },
  //       error: (err: any) => {
  //         console.error('Login error:', err);
  //         this.errorMessage = 'Nesprávne meno alebo heslo';
  //       }
  //     });

  //   }
  // }
  onSubmit() {
    if (!this.username || !this.password) {
      this.notify.notify('Zadajte používateľské meno a heslo.');
      return;
    }

    this.userService.login({ username: this.username, password: this.password }).subscribe({
      next: () => {
        // Token sa už uložil cez UserService → TokenService
        this.router.navigate(['/dashboard']);
      },
      error: (err: any) => {
        console.error('Login error:', err);
        this.notify.notify('Nesprávne meno alebo heslo');
      }
    });
  }



}

