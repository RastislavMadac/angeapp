import { Component, OnInit } from '@angular/core';
import { NotificationService, NotificationType } from '../../servicies/notification.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-notification-center',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notification-center.component.html',
  styleUrls: ['./notification-center.component.css']
})
export class NotificationCenterComponent implements OnInit {
  notification: { message: string, type?: NotificationType } | null = null;
  confirmMessage: string | null = null;
  private confirmResponse!: (result: boolean) => void;


  constructor(private notifyService: NotificationService) { }

  ngOnInit() {
    // Notifications (info / warn)
    this.notifyService.notifications$.subscribe(msg => {
      this.notification = msg;
      setTimeout(() => this.notification = null, 8000); // automatické skrytie po 3s
    });

    // Confirms – manuálne zatváranie
    this.notifyService.confirms$.subscribe(({ message, response }) => {
      this.confirmMessage = message;
      this.confirmResponse = response;
    });
  }

  // potvrdenie confirm správy
  respond(result: boolean) {
    this.confirmResponse(result);
    this.confirmMessage = null;
  }

  // manuálne zatvorenie confirm správy
  closeConfirm() {
    this.confirmMessage = null;
  }
}