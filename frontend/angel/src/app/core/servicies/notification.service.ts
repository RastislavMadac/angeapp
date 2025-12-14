import { Injectable } from '@angular/core';
import { Subject, Observable } from 'rxjs';

export type NotificationType = 'success' | 'info' | 'warn' | 'error';

// Interface pre dáta notifikácie (pre lepšiu typovú kontrolu)
export interface NotificationData {
    message: string;
    type: NotificationType;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {

    // Subject pre toasty
    private notifySubject = new Subject<NotificationData>();

    // Subject pre confirm modál
    private confirmSubject = new Subject<{ message: string, response: (result: boolean) => void }>();

    // --- GETTERS (Observables) ---

    get notifications$(): Observable<NotificationData> {
        return this.notifySubject.asObservable();
    }

    get confirms$() {
        return this.confirmSubject.asObservable();
    }

    // --- CORE METÓDA ---

    notify(message: string, type: NotificationType = 'info') {
        this.notifySubject.next({ message, type });
    }

    // --- HELPER METÓDY (Skratky) ---

    success(message: string) {
        this.notify(message, 'success');
    }

    error(message: string) {
        this.notify(message, 'error');
    }

    info(message: string) {
        this.notify(message, 'info');
    }

    warn(message: string) {
        this.notify(message, 'warn');
    }

    // --- KOMPATIBILITA (Alternatívne názvy, ktoré si mal v kóde) ---

    showSuccess(message: string) {
        this.success(message);
    }

    showError(message: string) {
        this.error(message);
    }

    showWarning(message: string) {
        this.warn(message);
    }

    // Niekedy sa používa showInfo, tak pre istotu:
    showInfo(message: string) {
        this.info(message);
    }

    // --- CONFIRM LOGIKA ---

    confirm(message: string): Promise<boolean> {
        return new Promise(resolve => {
            this.confirmSubject.next({ message, response: resolve });
        });
    }
}