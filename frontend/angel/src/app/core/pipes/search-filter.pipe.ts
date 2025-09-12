import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'searchFilter',
  standalone: true,   // dôležité pre standalone projekty
})
export class SearchFilterPipe implements PipeTransform {
  transform(items: any[], searchTerm: string, keys: string[]): any[] {
    if (!items) return [];
    if (!searchTerm) return items;

    const lower = searchTerm.toLowerCase();

    return items.filter(item =>
      keys.some(key =>
        String(item[key] ?? '').toLowerCase().includes(lower)
      )
    );
  }
}
