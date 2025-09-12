import { Component, Input, Output, EventEmitter, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableColumn } from '../../interface/tablecolumnn.interface';

import { FormsModule } from '@angular/forms'; // ← pridané

@Component({
  selector: 'app-generic-table',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './generic-table.component.html',
  styleUrls: ['./generic-table.component.css']
})
export class GenericTableComponent implements OnChanges {

  @Input() columns: TableColumn[] = [];
  @Input() data: any[] = [];
  @Input() selectedItem: any; // pridáme
  @Input() activeFilters: string[] = [];
  @Input() externalFilter: string | null = null;
  /** EventEmitter pre kliknutie na riadok */
  @Output() rowClick = new EventEmitter<any>();


  searchTerm = '';
  columnKeys: string[] = [];  // sem si pripravíš keys pre filter
  filteredData: any[] = [];

  private normalizeText(text: string): string {
    // odstráni diakritiku a prevádza na malé písmená
    return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  }
  ngOnChanges() {
    this.columnKeys = this.columns.map(c => c.key);
    this.filteredData = [...this.data];

    if (this.externalFilter?.trim()) {
      this.addFilter(this.externalFilter);
    }
  }

  /** Funkcia na kliknutie */
  onRowClick(row: any) {
    console.log('Row clicked:', row); // pridaj na test
    this.rowClick.emit(row);
  }
  getValue(item: any, key: string) {
    try {
      return key.split('.').reduce((obj, k) => (obj ? obj[k] : null), item);
    } catch {
      return null;
    }
  }

  onEnterPressed() {
    if (this.searchTerm.trim()) {
      this.activeFilters.push(this.searchTerm.trim().toLowerCase());
      this.searchTerm = '';
      this.applyFilters();
    }
  }

  applyFilters() {
    if (this.activeFilters.length === 0) {
      this.filteredData = [...this.data];
      return;
    }

    this.filteredData = this.data.filter(item =>
      this.activeFilters.every(filter =>
        this.columnKeys.some(key =>
          this.normalizeText(String(this.getValue(item, key) ?? '')).includes(filter)

        )
      )
    );
  }

  removeFilter(index: number) {
    this.activeFilters.splice(index, 1);
    this.applyFilters();
  }

  clearAllFilters() {
    this.activeFilters = [];
    this.filteredData = [...this.data];
  }
  addFilter(filter: string) {
    const normalized = filter.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    this.activeFilters.push(normalized);
    this.applyFilters();
  }

}