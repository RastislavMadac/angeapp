import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { UserService } from './core/servicies/user.service';
import { NotificationCenterComponent } from './core/components/notification-center/notification-center.component';


@Component({
  selector: 'app-root',
  standalone: true,
  template: `<app-notification-center></app-notification-center>
  <router-outlet></router-outlet>`,
  imports: [RouterOutlet, NotificationCenterComponent]
})
export class AppComponent implements OnInit {
  user: any = null;

  constructor(private userService: UserService) { }

  ngOnInit() {
    if (this.userService.isLoggedIn()) {
      this.userService.loadCurrentUser().subscribe({
        next: user => this.user = user,
        error: err => this.user = null,
      });
    }
  }
}
