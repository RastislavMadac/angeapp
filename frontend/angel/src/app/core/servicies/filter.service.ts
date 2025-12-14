import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class FilterService {
    // zoznam aktuálnych filtrov
    private filtersSubject = new BehaviorSubject<string[]>([]);
    // Observable pre subscribovanie
    filters$ = this.filtersSubject.asObservable();

    /**
     * Normalizuje string: odstráni diakritiku, trim, lowercase
     */
    private normalizeString(str: string): string {
        return str
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .trim();
    }

    /**
     * Pridá filter do zoznamu
     */
    addFilter(filter: string) {
        const normalized = this.normalizeString(filter);
        if (!normalized) return;

        const filters = this.filtersSubject.value;
        if (!filters.includes(normalized)) {
            this.filtersSubject.next([...filters, normalized]);
        }
    }

    /**
     * Odstráni filter podľa indexu
     */
    removeFilter(index: number) {
        const filters = [...this.filtersSubject.value];
        filters.splice(index, 1);
        this.filtersSubject.next(filters);
    }

    /**
     * Vymaže všetky filtre
     */
    clearFilters() {
        this.filtersSubject.next([]);
    }

    /**
     * Vráti aktuálne filtre (ako pole stringov)
     */
    getCurrentFilters(): string[] {
        return this.filtersSubject.value;
    }

    /**
     * Pomocná funkcia pre filtrovanie dát
     * Použi pri Observable mapovaní dát:
     *   normalizeFilter(value).includes(filter)
     */
    normalizeFilter(value: any): string {
        if (!value) return '';
        return this.normalizeString(value.toString());
    }
}
