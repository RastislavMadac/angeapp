import { Component, Input, Output, EventEmitter, TemplateRef, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-master-layout',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './master-layout.component.html',
  styleUrls: ['./master-layout.component.css']
})
export class MasterLayoutComponent<T = any> implements OnChanges {
  /** template pre master časť */
  @Input() masterTemplateInput!: TemplateRef<any>;

  /** template pre detail časť */
  @Input() detailTemplateInput!: TemplateRef<any>;

  /** zoznam položiek (napr. users, produkty) */
  @Input() items: T[] = [];

  /** aktuálne vybraná entita */
  @Input() selectedItem: T | null = null;

  /** emituje vybranú entitu */
  @Output() select = new EventEmitter<T>();

  @Output() selectedItemChange = new EventEmitter<T>();

  ngOnChanges(changes: SimpleChanges) {
    // Ak sa zmenil zoznam items a nie je vybraná žiadna položka, nastavíme prvú
    if (changes['items'] && this.items.length && !this.selectedItem) {
      this.setSelectedItem(this.items[0]);
    }
  }

  setSelectedItem(item: T) {
    this.selectedItem = item;
    this.select.emit(item);             // pôvodný výstup
    this.selectedItemChange.emit(item); // nový výstup pre two-way binding
  }
}
