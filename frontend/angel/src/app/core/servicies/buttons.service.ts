import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ButtonsService {
    //Delete button
    private deleteSubject = new Subject<void>();
    delete$ = this.deleteSubject.asObservable();

    //add Button
    private addSubject = new Subject<void>();
    add$ = this.addSubject.asObservable();

    //save Button
    private saveSubject = new Subject<void>();
    save$ = this.saveSubject.asObservable();

    //Delete button
    triggerDelete() {
        this.deleteSubject.next();
    }
    //add Button
    triggerAdd() {
        this.addSubject.next();
    }
    //save Button
    triggerSave() {
        this.saveSubject.next();
    }
}
