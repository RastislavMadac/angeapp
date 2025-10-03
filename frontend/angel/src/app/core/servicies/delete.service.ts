import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class DeleteService {
    private deleteSubject = new Subject<void>();
    delete$ = this.deleteSubject.asObservable();

    triggerDelete() {
        this.deleteSubject.next();
    }
}
