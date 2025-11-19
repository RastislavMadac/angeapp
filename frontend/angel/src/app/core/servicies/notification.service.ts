import { Injectable } from '@angular/core';
import { Subject, Observable } from 'rxjs';

export type NotificationType = 'success' | 'info' | 'warn' | 'error';;

@Injectable({ providedIn: 'root' })
export class NotificationService {


    // success(arg0: string) {
    //     throw new Error('Method not implemented.');
    // }
    // error(arg0: string) {
    //     throw new Error('Method not implemented.');
    // }
    // showSuccess(arg0: string) {
    //     throw new Error('Method not implemented.');
    // }
    // showError(arg0: string) {
    //     throw new Error('Method not implemented.');
    // }

    private notifySubject = new Subject<{ message: string, type?: NotificationType }>();
    private confirmSubject = new Subject<{ message: string, response: (result: boolean) => void }>();

    // notifikácie
    get notifications$(): Observable<{ message: string, type?: NotificationType }> {
        return this.notifySubject.asObservable();
    }

    notify(message: string, type: NotificationType = 'info') {
        this.notifySubject.next({ message, type });
    }

    // potvrdenia
    get confirms$() {
        return this.confirmSubject.asObservable();
    }

    confirm(message: string): Promise<boolean> {
        return new Promise(resolve => {
            this.confirmSubject.next({ message, response: resolve });
        });
    }

    /** Helper metóda pre chyby (Používa sa v komponentoch pri chybách) */

    showError(message: string) {

        this.notify(message, 'error');

    }



    // Ostatné helper metódy a confirm logika zostávajú nezmenené... 

    showSuccess(message: string) {

        this.notify(message, 'success');

    }
}
