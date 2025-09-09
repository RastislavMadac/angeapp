import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableColumn } from '../../interface/tablecolumnn.interface';


@Component({
  selector: 'app-generic-table',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './generic-table.component.html',
  styleUrls: ['./generic-table.component.css']
})
export class GenericTableComponent {
  @Input() columns: TableColumn[] = [];
  @Input() data: any[] = [];
  @Input() selectedItem: any; // pridáme

  /** EventEmitter pre kliknutie na riadok */
  @Output() rowClick = new EventEmitter<any>();

  /** Funkcia na kliknutie */
  onRowClick(row: any) {
    console.log('Row clicked:', row); // pridaj na test
    this.rowClick.emit(row);
  }
}
