import { Component } from '@angular/core';

import { Router } from '@angular/router';
import { UserService } from '../../core/servicies/user.service';

import { NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, NgIf], // FormsModule namiesto ReactiveFormsModule
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  username = '';
  password = '';
  errorMessage = '';

  constructor(private userService: UserService, private router: Router) { }

  onSubmit() {
    if (!this.username || !this.password) {
      this.errorMessage = 'Zadajte používateľské meno a heslo.';
      return;
    }

    this.userService.login({ username: this.username, password: this.password }).subscribe({
      next: (res: any) => {
        // Predpokladám, že `res` obsahuje token v res.token
        localStorage.setItem('token', res.token);  // Uloženie tokenu
        this.router.navigate(['/dashboard']);      // Navigácia po uložení tokenu
      },
      error: (err: any) => {
        console.error('Login error:', err);
        this.errorMessage = 'Nesprávne meno alebo heslo';
      }
    });

  }
}

