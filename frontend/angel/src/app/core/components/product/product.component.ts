import {
  Component, OnInit, ChangeDetectorRef
} from '@angular/core';
import { UserService } from '../../servicies/user.service';
import { FilterService } from '../../servicies/filter.service';

import { Product } from '../../interface/product.interface';

import { Category } from '../../interface/product.interface';
import { Unit } from '../../interface/product.interface';
import { ProductType } from '../../interface/product.interface';
import { CommonModule } from '@angular/common';
import { TableColumn } from '../../interface/tablecolumnn.interface';
import { GenericTableComponent } from '../generic-table/generic-table.component';
import { MasterLayoutComponent } from '../master-layout/master-layout.component';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NotificationService } from '../../servicies/notification.service';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ProductService } from '../../servicies/product.service';
import { forkJoin, tap } from 'rxjs';
import { NavbarComponent } from '../navbar/navbar.component';

@Component({
  selector: 'app-product',
  imports: [CommonModule, GenericTableComponent, MasterLayoutComponent, ReactiveFormsModule, MatButtonModule, MatIconModule, MatTooltipModule, MatToolbarModule, NavbarComponent],
  templateUrl: './product.component.html',
  styleUrls: ['./product.component.css']
})
export class ProductComponent implements OnInit {


  isLoading = true;
  errorMessage = ''
  product: Product[] = [];
  categories: Category[] = [];
  unit: Unit[] = [];
  productType: ProductType[] = [];


  selectedProduct: Product | null = null;
  productForm: FormGroup | null = null;

  constructor(
    private productService: ProductService,
    private userService: UserService,
    private fb: FormBuilder,
    private notify: NotificationService,
    private filterService: FilterService,
    private cdr: ChangeDetectorRef) { }

  ngOnInit(): void {
    this.loadLookups().subscribe({
      next: () => {
        this.loadProducts();
        if (this.selectedProduct) {
          this.initForm(this.selectedProduct);
        }// potom načítame produkty
      },
      error: err => console.error(err)
    });
  }

  handleRowClick(row: any) {
    this.selectedProduct = row;  // uchová vybraný produkt
    console.log('Vybraný produkt:', row);
  }

  //  vytvoriť novýproduct
  createNewProduct() {
    this.selectedProduct = null;
    this.initForm();
  }

  onDeleteProduct(product: Product) {
    // Odstráni zoznam
    this.product = this.product.filter(p => p.id !== product.id);
    this.selectedProduct = null; // zruší výber
  }

  loadLookups() {
    return forkJoin({
      categories: this.productService.loadAllCategory(),
      units: this.productService.loadAllUnits(),
      productTypes: this.productService.loadAllProductType()
    }).pipe(
      tap(result => {
        this.categories = result.categories;
        this.unit = result.units;
        this.productType = result.productTypes;

        console.log('Categories loaded:', this.categories);
        console.log('Units loaded:', this.unit);
        console.log('ProductTypes loaded:', this.productType);
      })
    );
  }



  columns: TableColumn[] = [
    { key: 'id', label: 'Kód', type: 'number' },
    { key: 'product_id', label: 'Kód produktu', type: 'number' },
    { key: 'internet_id', label: 'Internét kód', type: 'number' },
    { key: 'unit_name', label: 'Jednotka', type: 'text' },
    { key: 'product_type_name', label: 'Typ karty', type: 'text', },
    { key: 'is_serialized', label: 'Výrobná karta', type: 'boolean' },
    { key: 'product_name', label: 'Názov položky', type: 'text' },
    { key: 'description', label: 'Opis položky', type: 'text' },
    { key: 'weight_item', label: 'Hmotnosť položky', type: 'text' },
    { key: 'internet', label: 'Internet', type: 'boolean' },
    { key: 'ean_code', label: 'EAN kód', type: 'text' },
    { key: 'qr_code', label: 'QR kód', type: 'text' },
    { key: 'price_no_vat', label: 'Cena bez DPH', type: 'number' }, // alebo 'text' ak to má byť vždy string
    { key: 'total_quantity', label: 'Celkové množstvo', type: 'number' },
    { key: 'reserved_quantity', label: 'Rezervované množstvo', type: 'number' },
    { key: 'free_quantity', label: 'Voľné množstvo', type: 'number' },
    { key: 'created_by', label: 'Vytvoril', type: 'number' },
    { key: 'created_at', label: 'Dátum vytvorenia', type: 'date' }, // ISO dátum
    { key: 'updated_at', label: 'Dátum úpravy', type: 'date' },
    { key: 'updated_by', label: 'Upravil', type: 'number' }
  ]


  private loadProducts() {
    if (!this.userService.isLoggedIn()) {
      this.errorMessage = 'Nie ste prihlásený';
      this.isLoading = false;
      return;
    }

    this.isLoading = true;
    this.productService.loadAllProduct().subscribe({
      next: product => {
        this.product = product.map(p => ({ ...p, is_serialized: Boolean(p.is_serialized) }));
        this.isLoading = false;
      },
      error: err => {
        this.errorMessage = 'Nepodarilo sa načítať produkty';
        this.isLoading = false;
        console.error(err);
      }
    });
  }

  // inicializácia formulára pre edit alebo create
  initForm(product?: Product) {


    this.productForm = this.fb.group({
      product_id: [product?.product_id || '', Validators.required],
      internet_id: [product?.internet_id || ''],

      category: [this.categories.find(c => c.id === product?.category) || null, Validators.required],


      unit: [this.unit.find(u => u.id === product?.unit) || null, Validators.required],

      product_type: [this.productType.find(pt => pt.id === product?.product_type) || null, Validators.required],


      // tu je dôležité použiť presný objekt zo zoznamu
      is_serialized: [product?.is_serialized ?? false],
      product_name: [product?.product_name || '', Validators.required],
      description: [product?.description || ''],
      weight_item: [product?.weight_item || ''],
      internet: [product?.internet ?? false],
      ean_code: [product?.ean_code || ''],
      qr_code: [product?.qr_code || ''],
      price_no_vat: [product?.price_no_vat || '', Validators.required],
      total_quantity: [product?.total_quantity ?? 0],
      reserved_quantity: [product?.reserved_quantity ?? 0],
      free_quantity: [product?.free_quantity ?? 0],
      created_by: [product?.created_by || null],
      created_at: [product?.created_at || ''],
      updated_at: [product?.updated_at || ''],
      updated_by: [product?.updated_by || null]
    });
  }






  // ukladanie (edit alebo create)

  async selectProduct(product: Product) {
    if (this.productForm?.dirty) {
      const ok = await this.notify.confirm('Máte neuložené zmeny. Chcete ich uložiť?');

      if (ok) {
        await this.saveProduct(); // uloženie
      } else {
        this.notify.notify('Neuložené zmeny boli zahodené', 'warn'); // warning
        this.productForm.reset(product); // reset na nový produkt
      }
    }

    this.selectedProduct = product;
    this.initForm(product);
    this.cdr.detectChanges();
  }



  saveProduct() {
    if (!this.productForm || this.productForm.invalid) return;

    const formValue = this.productForm.value;

    // prepočet string/number polí, ak je potrebné
    const weight_item = typeof formValue.weight_item === 'string'
      ? parseFloat(formValue.weight_item)
      : formValue.weight_item;

    const price_no_vat = typeof formValue.price_no_vat === 'string'
      ? parseFloat(formValue.price_no_vat)
      : formValue.price_no_vat;

    if (this.selectedProduct) {
      // update (PATCH) – posielame len upravené polia
      const payload: any = {};

      if (formValue.product_id) payload.product_id = formValue.product_id;
      if (formValue.internet_id) payload.internet_id = formValue.internet_id;
      if (formValue.category) payload.category = formValue.category.id;
      if (formValue.unit) payload.unit = formValue.unit.id;
      if (formValue.product_type) payload.product_type = formValue.product_type.id;

      if (formValue.is_serialized !== undefined) payload.is_serialized = formValue.is_serialized;
      if (formValue.product_name) payload.product_name = formValue.product_name;
      if (formValue.description) payload.description = formValue.description;
      if (weight_item !== undefined) payload.weight_item = weight_item;
      if (formValue.internet !== undefined) payload.internet = formValue.internet;
      if (formValue.ean_code) payload.ean_code = formValue.ean_code;
      if (formValue.qr_code) payload.qr_code = formValue.qr_code;
      if (price_no_vat !== undefined) payload.price_no_vat = price_no_vat;
      if (formValue.total_quantity !== undefined) payload.total_quantity = formValue.total_quantity;
      if (formValue.reserved_quantity !== undefined) payload.reserved_quantity = formValue.reserved_quantity;
      if (formValue.free_quantity !== undefined) payload.free_quantity = formValue.free_quantity;

      this.productService.updateProduct(this.selectedProduct.id, payload).subscribe({
        next: res => {
          this.loadProducts();
          this.notify.notify('Produkt bol uložený', 'info');
          this.productForm?.markAsPristine();
        },
        error: err => console.error(err)
      });
    } else {
      // create (POST) – posielame všetky polia z formulára
      const payload: any = {
        ...formValue,
        weight_item,
        price_no_vat,
        category: formValue.category?.id,       // <-- zmena
        unit: formValue.unit?.id,               // <-- zmena
        product_type: formValue.product_type?.id // <-- zmena
      };


      this.productService.createProduct(payload).subscribe({
        next: res => {
          this.loadProducts();
          this.notify.notify('Produkt bol vytvorený', 'info');
          this.productForm?.markAsPristine();
        },
        error: err => console.error(err)
      });
    }
  }


  deleteProduct(product: Product | null) {
    if (!product) return; // nič neurobíme, ak je null
    if (!confirm(`Naozaj chcete zmazať používateľa ${product.id}?`)) return;

    this.productService.deleteProduct(product.id).subscribe({
      next: () => {
        this.loadProducts();
        if (this.selectedProduct?.id === product.id) this.selectedProduct = null;
        console.log('Používateľ zmazaný');

        // Vyčistíme detail
        this.selectedProduct = null;
        this.productForm = null;

      },
      error: err => console.error('Chyba pri mazání používateľa', err)
    });
  }


}
