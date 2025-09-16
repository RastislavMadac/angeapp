import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class FilterService {
    //zoznam slov
    private filtersSubject = new BehaviorSubject<string[]>([]);
    //hned sa prejavy aktualny stav
    filters$ = this.filtersSubject.asObservable();

    addFilter(filter: string) {
        const normalized = filter
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .trim();

        if (!normalized) return;

        const filters = this.filtersSubject.value;
        if (!filters.includes(normalized)) {
            this.filtersSubject.next([...filters, normalized]);
        }
    }

    removeFilter(index: number) {
        const filters = [...this.filtersSubject.value];
        filters.splice(index, 1);
        this.filtersSubject.next(filters);
    }

    clearFilters() {
        this.filtersSubject.next([]);
    }

    getCurrentFilters(): string[] {
        return this.filtersSubject.value;
    }
}
