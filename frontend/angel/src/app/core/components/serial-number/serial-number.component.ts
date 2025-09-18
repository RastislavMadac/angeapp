import {
  Component, OnInit, ViewChild
} from '@angular/core';
import { UserService } from '../../servicies/user.service';
import { FilterService } from '../../servicies/filter.service';
import { ProductService } from '../../servicies/product.service';
import { ProductSerialNumber } from '../../interface/serialNumber';
import { Product } from '../../interface/product.interface';

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
import { ProductSerialNumberService } from '../../servicies/serialNumber.service';
import { async, forkJoin, tap } from 'rxjs';
import { NavbarComponent } from '../navbar/navbar.component';

@Component({
  selector: 'app-serial-number',
  imports: [CommonModule, GenericTableComponent, MasterLayoutComponent, ReactiveFormsModule, MatButtonModule, MatIconModule, MatTooltipModule, MatToolbarModule, NavbarComponent],
  templateUrl: './serial-number.component.html',
  styleUrls: ['./serial-number.component.css']
})
export class SerialNumberComponent implements OnInit {
  isLoading = true;
  errorMessage = '';
  productSerialNumber: ProductSerialNumber[] = [];
  selectedProductSerialNumber: ProductSerialNumber | null = null;
  productSerialNumberForm: FormGroup | null = null;
  product: Product[] = [];


  constructor(
    private fb: FormBuilder,
    private productSerialNumberService: ProductSerialNumberService,
    private productService: ProductService,
    private userService: UserService,
    private notify: NotificationService
  ) { }

  ngOnInit(): void {
    this.loadLookups().subscribe({
      next: () => {
        this.loadProductsSerialNumber(); // načítame serial čísla
        if (this.selectedProductSerialNumber) {
          this.initForm(this.selectedProductSerialNumber); // pre edit
        }
      },
      error: err => console.error(err)
    });
  }



  handleRowClick(row: any) {
    this.selectedProductSerialNumber = row;  // uchová vybraný produkt
    console.log('Vybraný selectedProductSerialNumber:', row);
  }

  //  vytvoriť novýproduct
  createNewProductSerialNumber() {
    this.selectedProductSerialNumber = null;
    if (this.product.length) {
      this.initForm();
    } else {
      this.loadLookups().subscribe(() => this.initForm());
    }
  }




  onDeleteProduct(serial: ProductSerialNumber) {
    // Odstráni zoznam
    this.productSerialNumber = this.productSerialNumber.filter(p => p.id !== serial.id);
    this.selectedProductSerialNumber = null; // zruší výber
  }


  loadLookups() {
    return forkJoin({
      product: this.productService.loadAllProduct(),

    }).pipe(
      tap(result => {
        this.product = result.product;
        console.log('Product loaded:', this.product);

      })
    );
  }

  columns: TableColumn[] = [
    { key: 'id', label: 'Kód', type: 'number' },
    { key: 'product_name', label: 'Názov produktu', type: 'text' },
    { key: 'serial_number', label: 'Seriové číslo', type: 'text' },
    { key: 'created_at', label: 'Vytvorené', type: 'text' },
  ]

  private loadProductsSerialNumber() {
    if (!this.userService.isLoggedIn()) {
      this.errorMessage = 'Nie ste prihlásený';
      this.isLoading = false;
      return;
    }

    this.isLoading = true;
    this.productSerialNumberService.loadAllProductSerialNumber().subscribe({
      next: (serialNumbers: ProductSerialNumber[]) => {
        this.productSerialNumber = serialNumbers.map(p => ({ ...p, is_serialized: Boolean(p.is_serialized) }));
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
  initForm(serial?: ProductSerialNumber) {
    // nájde produkt podľa ID
    const selectedProduct = serial?.product
      ? this.product.find(p => p.id === serial.product) || null
      : null;

    this.productSerialNumberForm = this.fb.group({
      serial_number: [serial?.serial_number || '', Validators.required],
      product: [selectedProduct, Validators.required], // celý objekt
    });
  }


  // this.productSerialNumberForm = this.fb.group({
  //   id: [serial?.id || '', Validators.required],
  //   serial_number: [serial?.serial_number || '', Validators.required],
  //   product: [this.product.find(p => p.id === serial?.product) || null, Validators.required],


  //   created_at: [serial?.created_at || ''],
  // });


  // ukladanie (edit alebo create)

  async selectProductSerialNumber(productSerialNumber: ProductSerialNumber) {
    if (this.productSerialNumberForm?.dirty) {
      const ok = await this.notify.confirm('Máte neuložené zmeny. Chcete ich uložiť?');

      if (ok) {
        await this.saveProductSerialNumber(); // uloženie
      } else {
        this.notify.notify('Neuložené zmeny boli zahodené', 'warn'); // warning
        this.productSerialNumberForm.reset(productSerialNumber); // reset na nový produktSerialNumber
      }
    }

    this.selectedProductSerialNumber = productSerialNumber;
    this.initForm(productSerialNumber);
  }

  saveProductSerialNumber() {
    if (!this.productSerialNumberForm || this.productSerialNumberForm.invalid) return;

    const formValue = this.productSerialNumberForm.value;



    if (this.selectedProductSerialNumber) {
      // update (PATCH) – posielame len upravené polia
      // pri ukladaní
      const payload = {
        serial_number: formValue.serial_number,
        product: formValue.product.id, // pošle ID produktu
      };



      // const payload: any = {};

      // if (formValue.id) payload.id = formValue.id;
      // if (formValue.product) payload.product = formValue.product.id;
      // // if (formValue.category) payload.category_id = formValue.category.id;
      // if (formValue.serial_number) payload.serial_number = formValue.serial_number;
      // if (formValue.created_at) payload.created_at = formValue.created_at

      this.productSerialNumberService.updateProductSerialNumber(this.selectedProductSerialNumber.id, payload).subscribe({
        next: res => {
          this.loadProductsSerialNumber();
          this.notify.notify('Produkt bol uložený', 'info');
          this.productSerialNumberForm?.markAsPristine();
        },
        error: err => console.error(err)
      });
    } else {
      // create (POST) – posielame všetky polia z formulára
      const payload: any = {
        ...formValue,


        product: formValue.product.id
      };

      this.productSerialNumberService.createProductSerialNumber(payload).subscribe({
        next: res => {
          this.loadProductsSerialNumber();
          this.notify.notify('Produkt bol vytvorený', 'info');
          this.productSerialNumberForm?.markAsPristine();
        },
        error: err => console.error(err)
      });
    }
  }


  deleteProduct(serial: ProductSerialNumber | null) {
    if (!serial) return;
    if (!confirm(`Naozaj chcete zmazať seriové číslo ${serial.serial_number}?`)) return;

    this.productService.deleteProduct(serial.id).subscribe({
      next: () => {
        this.loadProductsSerialNumber();
        if (this.selectedProductSerialNumber?.id === serial.id) this.selectedProductSerialNumber = null;
        console.log('Seriové ćíslo zmazané');

        // Vyčistíme detail
        this.selectedProductSerialNumber = null;
        this.productSerialNumberForm = null;

      },
      error: err => console.error('Chyba pri mazání seropvého čísla', err)
    });
  }


}

