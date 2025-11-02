// import { Component, Input, Output, EventEmitter, OnChanges, ChangeDetectorRef } from '@angular/core';
// import { MasterLayoutComponent } from '../master-layout/master-layout.component';
// import { GenericTableComponent } from '../generic-table/generic-table.component';
// import { ProductPlanInterface, ProductPlanProductsInterface } from '../../interface/productPlan.interface';
// import { CommonModule } from '@angular/common';
// import { TableColumn } from '../../interface/tablecolumnn.interface';
// import { FormArray, FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
// import { NavbarComponent } from '../navbar/navbar.component';

// @Component({
//   selector: 'app-product-plan-table',
//   standalone: true,
//   imports: [
//     MasterLayoutComponent,
//     GenericTableComponent,
//     CommonModule,
//     FormsModule,
//     ReactiveFormsModule,
//     NavbarComponent
//   ],
//   templateUrl: './product-plan-table.component.html',
//   styleUrls: ['./product-plan-table.component.css']
// })
// export class ProductPlanTableComponent implements OnChanges {
//   @Input() plan!: ProductPlanInterface;
//   @Output() selectedItemChange = new EventEmitter<any>();

//   form!: FormGroup;                  // Form pre detail plánu + položky
//   selectedItem: any = null;

//   planColumns: TableColumn[] = [
//     { key: 'plan_number', label: 'Číslo plánu', type: 'text' },
//     { key: 'plan_type', label: 'Typ plánu', type: 'text' },
//     { key: 'start_date', label: 'Platný od', type: 'text' },
//     { key: 'end_date', label: 'Platný do', type: 'text' },
//   ];

//   itemColumns: TableColumn[] = [
//     { key: 'product_id', label: 'Kód produktu', type: 'text' },
//     { key: 'product_name', label: 'Názov produktu', type: 'text' },
//     { key: 'planned_quantity', label: 'Plánované množstvo', type: 'number' },
//     { key: 'status', label: 'Status', type: 'text' },
//     { key: 'transfered_pcs', label: 'Prenesené množstvo', type: 'number' }
//   ];

//   displayedPlan: any[] = [];       // Jeden riadok plánu
//   displayedItems: any[] = [];      // Položky

//   constructor(private cd: ChangeDetectorRef, private fb: FormBuilder) { }

//   ngOnChanges() {
//     if (!this.plan) return;

//     console.log('%c📌 Input plan:', 'color: blue; font-weight: bold;', this.plan);

//     // 1️⃣ Zobrazenie detailu plánu
//     this.displayedPlan = [{
//       id: this.plan.id,
//       plan_number: this.plan.plan_number,
//       plan_type: this.plan.plan_type,
//       start_date: this.plan.start_date,
//       end_date: this.plan.end_date
//     }];

//     // 2️⃣ Zobrazenie položiek
//     this.displayedItems = this.plan.items?.map(item => ({
//       id: item.id,
//       product_id: item.product_id,
//       product_name: item.product_name,
//       planned_quantity: item.planned_quantity,
//       status: item.status,
//       transfered_pcs: item.transfered_pcs
//     })) || [];

//     // Trigger ChangeDetector, aby sa zmeny vykreslili
//     this.cd.detectChanges();
//   }

//   // Funkcia pre selekciu riadku master tabuľky
//   onSelectItem(row: any) {
//     console.log("%c📌 Selected item:", 'color: green; font-weight: bold;', row);
//     this.selectedItem = row;

//     // Inicializácia form pre detail
//     this.form = this.fb.group({
//       id: [row.id],
//       plan_number: [row.plan_number, Validators.required],
//       plan_type: [row.plan_type, Validators.required],
//       start_date: [row.start_date, Validators.required],
//       end_date: [row.end_date, Validators.required],
//       items: this.fb.array(
//         (row.items || []).map((item: ProductPlanProductsInterface) => this.initItemForm(item))
//       )

//     });

//     this.selectedItemChange.emit(row);
//     this.cd.detectChanges();
//   }

//   // Inicializácia FormGroup pre jednu položku
//   initItemForm(item?: ProductPlanProductsInterface): FormGroup {
//     return this.fb.group({
//       id: [item?.id ?? null],
//       production_plan: [item?.production_plan ?? null, Validators.required],
//       product: [item?.product ?? null, Validators.required],
//       product_name: [item?.product_name ?? '', Validators.required],
//       planned_quantity: [item?.planned_quantity ?? 0, [Validators.required, Validators.min(0)]],
//       planned_date: [item?.planned_date ?? '', Validators.required],
//       status: [item?.status ?? 'pending', Validators.required],
//       production_card: [item?.production_card ?? null],
//       transfered_pcs: [item?.transfered_pcs ?? 0, [Validators.min(0)]]
//     });
//   }


//   // Getter pre *ngFor vo FormArray
//   get itemsFormArray(): FormArray {
//     return this.form.get('items') as FormArray;
//   }

//   // CSS pre odlíšenie master riadkov
//   rowClassMap = (row: any) => row.plan_number ? 'plan-row' : '';
// }
