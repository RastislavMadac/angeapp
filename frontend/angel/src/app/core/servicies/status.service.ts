import { Injectable } from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class StatusService {
    getCssClass(status: string): string {
        if (!status) return '';

        switch (status.toLowerCase()) {
            case 'pending': return 'status-pending';
            case 'processing':
            case 'in_production': return 'status-processing';
            case 'partially_completed': return 'status-partial';
            case 'completed': return 'status-completed';
            case 'canceled': return 'status-canceled';
            default: return '';
        }
    }

    // Voliteľné: univerzálna logika pre pole položiek (priorita stavov)
    getRowStatusClass(items: any[]): string {
        if (!items || items.length === 0) return 'badge-no-items';

        if (items.some(i => i.status === 'canceled')) return this.getCssClass('canceled');
        if (items.some(i => i.status === 'in_production')) return this.getCssClass('in_production');
        if (items.some(i => i.status === 'pending')) return this.getCssClass('pending');
        if (items.some(i => i.status === 'partially_completed')) return this.getCssClass('partially_completed');
        if (items.every(i => i.status === 'completed')) return this.getCssClass('completed');

        return 'badge-mixed-status';
    }
}
