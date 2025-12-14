import { Component, ChangeDetectionStrategy, Input, OnInit, OnDestroy, Output, EventEmitter, SimpleChanges, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableColumn } from '../../interface/tablecolumnn.interface';
import { Subscription } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { FilterService } from '../../servicies/filter.service';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { TemplateRef } from '@angular/core';

@Component({
  selector: 'app-generic-table',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatButtonModule],
  templateUrl: './generic-table.component.html',
  styleUrls: ['./generic-table.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GenericTableComponent<T extends object> implements OnInit, OnChanges, OnDestroy {

  // ---------- Zobrazenie dát ----------
  // šablóna detailu pre collapsible
  @Input() detailTemplate: TemplateRef<any> | null = null;

  // stav rozbalenia pre jednotlivé riadky
  showCollapse: { [key: string]: boolean } = {};
  @Input() data: T[] = [];
  @Input() columns: TableColumn[] = [];
  @Output() rowClick = new EventEmitter<T>();
  @Output() selectedItemChange = new EventEmitter<T>();

  @Input() selectedItem: T | null = null;

  filteredData: T[] = [];
  headers: TableColumn[] = [];
  //Zviraznenie
  @Input() cellClassMap: { [key: string]: (value: any, row: any) => string } = {};

  @Input() rowClassMap: (row: any) => string = () => '';

  @Input() defaultSortColumn: string | null = null; // nový input


  sortColumn: string | null = null;
  sortAsc: boolean = true;

  toggleCollapse(row: T) {
    const key = this.rowKey(row);
    this.showCollapse[key] = !this.showCollapse[key];
  }
  rowKey(row: T): string {
    // ak má objekt id, použijeme ho, inak JSON string
    return (row as any).id ?? JSON.stringify(row);
  }

  sortData(columnKey: string) {
    if (this.sortColumn === columnKey) {
      // prepni smer (asc/desc)
      this.sortAsc = !this.sortAsc;
    } else {
      this.sortColumn = columnKey;
      this.sortAsc = false; // čísla default od najväčšieho
    }

    this.filteredData = [...this.filteredData].sort((a, b) => {
      let valA = this.getValue(a, columnKey);
      let valB = this.getValue(b, columnKey);

      // --- číselné triedenie ---
      const numA = Number(valA);
      const numB = Number(valB);
      if (!isNaN(numA) && !isNaN(numB)) {
        return this.sortAsc ? numA - numB : numB - numA;
      }

      // --- dátumové triedenie ---
      const dateA = new Date(valA);
      const dateB = new Date(valB);
      if (!isNaN(dateA.getTime()) && !isNaN(dateB.getTime())) {
        return this.sortAsc
          ? dateA.getTime() - dateB.getTime()
          : dateB.getTime() - dateA.getTime();
      }

      // --- textové triedenie ---
      const strA = valA?.toString().toLowerCase() ?? '';
      const strB = valB?.toString().toLowerCase() ?? '';
      return this.sortAsc ? strA.localeCompare(strB) : strB.localeCompare(strA);
    });
  }


  // ---------- Vyhľadávanie/filtrovanie ----------
  private filterSub!: Subscription;

  constructor(private filterService: FilterService) { }

  ngOnInit() {
    // nastav hlavičky tabuľky
    this.headers = this.columns && this.columns.length
      ? this.columns
      : this.generateHeadersFromData();

    // subscribe na filtre – toto je čisté vyhľadávanie
    this.filterSub = this.filterService.filters$.subscribe(filters => {
      this.applyFilters(filters);
    });


    this.filteredData = [...this.data];

    // ak je zadaný default stĺpec na zoradenie
    if (this.defaultSortColumn) {
      this.sortColumn = this.defaultSortColumn;
      this.sortAsc = true; // A-Z
      this.sortData(this.sortColumn); // zavoláme sort
    }
  }



  ngOnChanges(changes: SimpleChanges) {
    if (changes['data']) {
      this.refreshData();
    }
  }

  ngOnDestroy() {
    if (this.filterSub) {
      this.filterSub.unsubscribe();
    }
  }

  // ---------- Zobrazenie tabuľky ----------
  private refreshData() {
    // obnoví filteredData na aktuálne dáta (bez filtra)
    this.filteredData = [...this.data];

    // ak nie sú zadané columns → generuje dynamicky
    if (!this.columns.length) {
      this.headers = this.generateHeadersFromData();
    }
  }

  private generateHeadersFromData(): TableColumn[] {
    if (!this.data || !this.data.length) return [];
    const allKeys = this.data.flatMap(row => Object.keys(row));
    return Array.from(new Set(allKeys)).map(k => ({ key: k, label: k }));
  }

  onRowClick(row: T) {
    this.selectedItem = row;
    this.rowClick.emit(row);
    if (this.isSelected(row)) {
      this.toggleCollapse(row);
    }
  }

  getValue(item: any, key: string) {
    try {
      return key.split('.').reduce((obj, k) => (obj ? obj[k] : null), item);
    } catch {
      return null;
    }
  }

  isSelected(row: T): boolean {
    return this.selectedItem === row;
  }

  // ---------- Vyhľadávanie/filtrovanie ----------
  private applyFilters(filters: string[]) {
    if (!filters.length) {
      // žiadne filtre → všetky dáta
      this.filteredData = [...this.data];
      return;
    }

    // viacstupňové AND filtrovanie
    this.filteredData = this.data.filter((row: any) =>
      filters.every(filter =>
        JSON.stringify(row)
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase()
          .includes(filter)
      )
    );

  }




}