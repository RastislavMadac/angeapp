import { Component, Output, EventEmitter, OnInit, ChangeDetectorRef } from '@angular/core';
import { UserService } from '../../servicies/user.service';
import { ProductService } from '../../servicies/product.service';
import { Product } from '../../interface/product.interface';
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
  selector: 'app-orders-product',
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
  templateUrl: './orders-product.component.html',
  styleUrls: ['./orders-product.component.css']
})
export class OrdersProductComponent implements OnInit {
  @Output() productSelected = new EventEmitter<Product>();
  @Output() closeDoor = new EventEmitter<void>();
  onClose() { this.closeDoor.emit(); }
  // --------------------------
  // --- Stav komponentu ---
  // --------------------------
  isLoading = true;
  errorMessage = '';
  product: Product[] = [];
  selectedProduct!: Product;
  ProductForm: FormGroup | null = null;

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
    private productService: ProductService,
    private userService: UserService,
    private cdr: ChangeDetectorRef
  ) { }
  // --------------------------
  // --- Lifecycle hook ---
  // --------------------------
  ngOnInit(): void {
    this.loadProducts();
  }
  // ==========================
  // === CRUD LOGIKA ==========
  // ==========================
  private loadProducts() {
    if (!this.userService.isLoggedIn()) {
      this.errorMessage = 'Nie ste prihlásený';
      this.isLoading = false;
      return;
    }

    this.isLoading = true;
    this.productService.loadAllProduct().subscribe({
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
  selectProduct(product: Product) {
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
