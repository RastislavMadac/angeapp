import { Component } from '@angular/core';
import { UserService } from '../../servicies/user.service';
import { CommonModule } from '@angular/common';
import { NavbarComponent } from '../navbar/navbar.component';



@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, NavbarComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],

})
export class DashboardComponent {
  constructor(private userService: UserService) { }

  get user() {
    return this.userService.getUser()
  }

  logout() {
    this.userService.logout();
  }
}
