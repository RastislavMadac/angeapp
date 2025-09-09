import { Component, Input } from '@angular/core';
import { UserService } from '../../servicies/user.service';
import { Router } from '@angular/router';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterModule, CommonModule, MatButtonModule, MatIconModule, MatToolbarModule],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css'],
})



export class NavbarComponent {
  logoUrl = 'letter-a.png';


  constructor(private userService: UserService, private router: Router) { }


  get user() {
    return this.userService.getUser()
  }
  // getter sprístupní iba to, čo šablóna potrebuje
  get isAdmin(): boolean {
    return this.userService.isAdmin();
  }

  navigateTo(route: string) {
    this.router.navigate([route]);
  }

  logout() {
    this.userService.logout();
    this.router.navigate(['/login']);
  }
}
