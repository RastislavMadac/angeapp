import { Component, Output, EventEmitter, OnInit, ChangeDetectorRef } from '@angular/core';
import { UserService } from '../../servicies/user.service';
import { ProductPlanService } from '../../servicies/productPlan.service';
import { ProductPlanItemsInterface } from '../../interface/productPlan.interface';
import { CommonModule } from '@angular/common';
import { TableColumn } from '../../interface/tablecolumnn.interface';

import { GenericTableComponent } from '../generic-table/generic-table.component';
import { MasterLayoutComponent } from '../master-layout/master-layout.component';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NavbarComponent } from '../navbar/navbar.component';
import { FormGroup } from '@angular/forms';

@Component({
  selector: 'app-product-plan-product',
  standalone: true,
  imports: [
    CommonModule,
    GenericTableComponent,
    MasterLayoutComponent,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatToolbarModule,
    NavbarComponent
  ],
  templateUrl: './product-plan-products.html',
  styleUrls: ['./product-plan-products.css']
})
export class ProductPlanProductComponent implements OnInit {

  @Output() closeDoor = new EventEmitter<void>();
  @Output() productSelected = new EventEmitter<ProductPlanItemsInterface>();
  onClose() { this.closeDoor.emit(); }



  isLoading = true;
  errorMessage = '';
  product: ProductPlanItemsInterface[] = [];
  ProductForm: FormGroup | null = null;
  selectedProduct!: ProductPlanItemsInterface;

  columns: TableColumn[] = [
    { key: 'id', label: 'Kód', type: 'number' },
    { key: 'product_id', label: 'Kód produktu', type: 'number' },
    { key: 'internet_id', label: 'Internét kód', type: 'number' },
    { key: 'product_name', label: 'Názov položky', type: 'text' },
    { key: 'description', label: 'Opis položky', type: 'text' },
    { key: 'price_no_vat', label: 'Cena bez DPH', type: 'number' },
    { key: 'total_quantity', label: 'Celkové množstvo', type: 'number' },
    { key: 'category_name:', label: 'Kategoria', type: 'text' },
    { key: 'product_type_name', label: 'Celkové množstvo', type: 'text' },
  ];

  // --------------------------
  // --- Konstruktor ---
  // --------------------------
  constructor(
    private productPlanSertvice: ProductPlanService,
    private userService: UserService,
    private cdr: ChangeDetectorRef
  ) { }

  // --------------------------
  // --- Lifecycle hook ---
  // --------------------------
  ngOnInit(): void {
    this.loadProducts();
  }

  private loadProducts() {
    if (!this.userService.isLoggedIn()) {
      this.errorMessage = 'Nie ste prihlásený';
      this.isLoading = false;
      return;
    }

    this.isLoading = true;
    this.productPlanSertvice.loadAllProductForPlans().subscribe({
      next: products => {
        this.product = products.map(p => ({ ...p, is_serialized: Boolean(p.is_serialized) }));
        this.isLoading = false;
      },
      error: err => {
        this.errorMessage = 'Nepodarilo sa načítať produkty';
        this.isLoading = false;
        console.error(err);
      }
    });
  }

  selectProduct(product: ProductPlanItemsInterface) {
    console.log('Klikol si na Produkt:', product);
    this.selectedProduct = product;  // zatiaľ si ho len uložíme lokálne
    this.cdr.detectChanges();// <--- PRIDAŤ ChangeDetectorRef

  }

  confirmSelection() {
    if (this.selectedProduct) {
      this.productSelected.emit(this.selectedProduct);  // 
    }
    this.closeDoor.emit()
  }


}
