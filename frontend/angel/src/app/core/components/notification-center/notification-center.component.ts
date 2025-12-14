import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
// Uisti sa, že importuješ aj interface NotificationData, ak ho máš v service
import { NotificationService, NotificationType, NotificationData } from '../../servicies/notification.service';

@Component({
  selector: 'app-notification-center',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notification-center.component.html',
  styleUrls: ['./notification-center.component.css']
})
export class NotificationCenterComponent implements OnInit, OnDestroy {

  // Používame typ NotificationData pre bezpečnosť
  notification: NotificationData | null = null;
  confirmMessage: string | null = null;

  private confirmResponse: ((result: boolean) => void) | null = null;
  private timeoutId: any;
  private subs = new Subscription(); // Pre správne odhlásenie odberov

  constructor(private notifyService: NotificationService) { }

  ngOnInit() {
    // 1. Notifikácie (Toast)
    const notifSub = this.notifyService.notifications$.subscribe(msg => {
      this.notification = msg;

      // DÔLEŽITÉ: Ak už beží odpočet pre predchádzajúcu správu, zrušíme ho
      if (this.timeoutId) {
        clearTimeout(this.timeoutId);
      }

      // Nastavíme nový odpočet (3 sekundy sú pre používateľa ideálne, 8 je dlho)
      this.timeoutId = setTimeout(() => {
        this.notification = null;
      }, 3000);
    });
    this.subs.add(notifSub);

    // 2. Potvrdenia (Confirm)
    const confirmSub = this.notifyService.confirms$.subscribe(({ message, response }) => {
      this.confirmMessage = message;
      this.confirmResponse = response;
    });
    this.subs.add(confirmSub);
  }

  // Akcia: Užívateľ klikol Áno/Nie
  respond(result: boolean) {
    if (this.confirmResponse) {
      this.confirmResponse(result);
    }
    this.closeConfirm();
  }

  // Akcia: Zatvorenie okna (X)
  closeConfirm() {
    this.confirmMessage = null;
    this.confirmResponse = null;
  }

  // Upratovanie pri zničení komponentu
  ngOnDestroy() {
    this.subs.unsubscribe();
    if (this.timeoutId) clearTimeout(this.timeoutId);
  }
}