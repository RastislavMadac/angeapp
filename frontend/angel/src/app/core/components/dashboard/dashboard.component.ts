import { Component } from '@angular/core';
import { UserService } from '../../servicies/user.service';
import { CommonModule } from '@angular/common';



@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
  template: `
    <h1>Dashboard</h1>
    `,
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
