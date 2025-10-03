import { Component, OnInit, Output, Input, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { OrderInterface } from '../../interface/order.interface';
import { OrderItemInterface } from '../../interface/order-item.interface';

import { OrderService } from '../../servicies/order.service';
import { debounceTime, distinctUntilChanged, switchMap, catchError, of } from 'rxjs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { OrdersCustomersComponent } from '../orders-customers/orders-customers.component';
import { CustomersInterface } from '../../interface/customer.interface';
import { NavbarComponent } from '../navbar/navbar.component';
import { DeleteService } from '../../servicies/delete.service';

@Component({
  selector: 'app-order-items',
  standalone: true,
  imports: [CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    OrdersCustomersComponent,
    NavbarComponent],
  templateUrl: './order-items.component.html',
  styleUrls: ['./order-items.component.css']
})
export class OrderItemsComponent implements OnInit, OnChanges {
  @Output() close = new EventEmitter<void>();               // 🔹 Event, ktorý oznámi rodičovi, že sa má modal zavrieť
  @Input() order: OrderInterface | null = null;             // 🔹 Aktuálna objednávka, ktorú editujeme
  @Input() items: OrderItemInterface[] = [];                // 🔹 Položky objednávky (riadky s produktmi)
  @Output() updated = new EventEmitter<OrderInterface>();   // 🔹 Event, ktorým posielame rodičovi aktualizovanú objednávku
  orderForm!: FormGroup;                                    // 🔹 Reactive Form pre základné údaje objednávky
  itemsForm!: FormGroup;                                    // 🔹 Reactive Form pre položky objednávky (obsahuje FormArray)
  showModal = false;
  constructor(private fb: FormBuilder,
    private productService: OrderService,
    private deleteService: DeleteService) { } // 🔹 Vstrekovanie FormBuildera a OrderService
  selectedCustomer: CustomersInterface | null = null;
  selectedItem: any = null;
  selectedItemIndex: number | null = null;


  selectItem(item: any, index: number) {
    this.selectedItem = item;
    this.selectedItemIndex = index;
    console.log("this.selectedItem", this.selectedItem);
    console.log("this.selectedItemIndex", this.selectedItemIndex);
  }


  // pri výbere zákazníka z modalu
  onCustomerSelected(customer: CustomersInterface) {
    this.selectedCustomer = customer;
    console.log('Vybraný zákazník:', customer);

    // patch do formulára: ID pre backend, meno pre UI
    this.orderForm.patchValue({
      customer_id: customer.id,     // toto sa pošle do backendu
      customer_name: customer.name,  // toto sa iba zobrazuje v inpute

    });
    console.log("customer_id vo forme =", this.orderForm.value.customer_id);
  }


  //🔹 Modal Okno
  openModal() { this.showModal = true; console.log('Modal showModal =', this.showModal); }
  closeModal() { this.showModal = false }


  // 🔹 Spustí sa pri prvom načítaní komponentu
  ngOnInit(): void {
    document.body.classList.add('modal-open'); // pridáme CSS triedu na body (aby sa zablokoval scroll pozadia)
    this.loadDetails();                        // vytvoríme formuláre podľa aktuálnej objednávky
    this.setupLiveProductLoading();            // nastavíme live vyhľadávanie produktov podľa kódu
    // Predplatíme sa na event z Navbar
    this.deleteService.delete$.subscribe(() => this.deleteSelectedItem());

  }

  // 🔹 Reaguje na zmeny Inputov (napr. keď items prídu oneskorene)
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['items'] && !changes['items'].firstChange) {
      this.loadDetails();             // ak sa zmenia položky, znova postavíme formuláre
      this.setupLiveProductLoading(); // a znovu nastavíme live vyhľadávanie
    }
  }

  // 🔹 Vytvorenie formulárov pre objednávku a položky
  loadDetails() {
    // FormGroup pre základné údaje objednávky
    this.orderForm = this.fb.group({
      order_number: [this.order?.order_number ?? '', Validators.required], // číslo objednávky (povinné)
      customer_id: [this.order?.customer_id ?? null, Validators.required],         // zákazník (povinné)
      customer_name: [this.order?.customer ?? '', Validators.required],         // zákazník (povinné)
      status: [this.order?.status ?? 'pending'],                           // stav objednávky (default = pending)
      total_price: [this.order?.total_price ?? 0, Validators.min(0)]       // celková cena (nesmie byť < 0)
    });

    // FormArray pre položky objednávky
    this.itemsForm = this.fb.group({
      items: this.fb.array(
        this.items.map(item =>
          this.fb.group({
            order_item_id: [item.id],                    // ID riadku objednávky (DB ID položky)
            product_db_id: [item.product_id],            // interné DB ID produktu
            product_code: [item.product_code || ''],     // kód produktu (používa sa na vyhľadanie)
            product: [item.product || '', Validators.required], // názov produktu (povinný)
            quantity: [item.quantity, [Validators.required, Validators.min(1)]], // množstvo (min. 1)
            price: [item.price, [Validators.required, Validators.min(0)]]        // cena (min. 0)
          })
        )
      )
    });
    // 🔹 Live update celkovej ceny pri zmene množstva alebo ceny
    this.itemsArray.controls.forEach(itemCtrl => {
      itemCtrl.get('quantity')?.valueChanges.subscribe(() => this.updateTotalPrice());
      itemCtrl.get('price')?.valueChanges.subscribe(() => this.updateTotalPrice());
    });
    // spočítame total_price aj po načítaní
    this.updateTotalPrice();
  }

  // 🔹 Getter na FormArray položiek (zjednoduší prístup k itemsForm.items)
  get itemsArray(): FormArray {
    return this.itemsForm.get('items') as FormArray;
  }

  // 🔹 Uloženie zmien objednávky a položiek (PATCH request)

  // PATCH objednávky
  saveItems(): void {
    console.log("SAVEITEMS SPUSTENA");
    console.log('Order ID:', this.order?.id);

    // Debug pre formy
    console.log("orderForm.valid =", this.orderForm.valid, "orderForm.value =", this.orderForm.value);
    console.log("itemsForm.valid =", this.itemsForm.valid, "itemsForm.value =", this.itemsForm.value);

    // Kontrola, či kontrola customer_id vôbec existuje
    const customerIdControl = this.orderForm.get('customer_id');
    console.log("customer_id control exists?", !!customerIdControl);
    console.log("customer_id value =", customerIdControl?.value, "type =", typeof customerIdControl?.value);

    // fallback: ak je customer_id null/"" → vezmi pôvodný z this.order
    const safeCustomerId = this.orderForm.value.customer_id ?? this.order?.customer_id;

    // payload pre PATCH
    const updatedOrder = {
      status: this.orderForm.value.status,
      customer_id: safeCustomerId,
      total_price: this.orderForm.value.total_price
    };

    // premapujeme položky
    const updatedItems = this.itemsForm.value.items.map((item: any) => ({
      id: item.order_item_id,
      product_id: item.product_db_id,
      quantity: item.quantity,
      price: item.price
    }));

    const payload = {
      ...updatedOrder,
      items: updatedItems
    };

    console.log("PATCH payload (to be sent):", payload);

    if (this.order?.id) {
      this.productService.updateOrder(this.order.id, payload).subscribe({
        next: (res) => {
          console.log('✅ Objednávka aktualizovaná:', res);
          this.updated.emit(res);
          this.itemsForm.markAsPristine();
          this.orderForm.markAsPristine();
          this.close.emit();
        },
        error: (err) => {
          console.error('❌ Chyba pri ukladaní objednávky:', err);
        }
      });
    }
  }


  // 🔹 Zavretie modalu (emitne close event)
  onClose() {
    this.close.emit();
  }

  // 🔹 Nastaví live vyhľadávanie produktov podľa product_code
  setupLiveProductLoading() {
    if (!this.itemsArray) return;

    // Prejdeme každú položku v poli
    this.itemsArray.controls.forEach(itemCtrl => {
      const productCodeCtrl = itemCtrl.get('product_code'); // kontrolka pre product_code
      if (!productCodeCtrl) return;

      productCodeCtrl.valueChanges
        .pipe(
          debounceTime(300),        // počkáme 300ms po poslednom písaní
          distinctUntilChanged(),   // spustí sa iba ak sa hodnota zmení
          switchMap(code => {
            if (!code) {
              // ak je pole prázdne → resetujeme produkt
              itemCtrl.patchValue({ product: '', product_db_id: null, price: 0 });
              return of(null);
            }
            // inak skúšame načítať produkt z backendu podľa kódu
            return this.productService.getProductByCode(code).pipe(
              catchError(() => {
                // ak produkt neexistuje → resetujeme hodnoty
                itemCtrl.patchValue({ product: '', product_db_id: null, price: 0 });
                return of(null);
              })
            );
          })
        )
        .subscribe(product => {
          // ak API vráti platný produkt → doplníme hodnoty
          if (product && product.id) {
            itemCtrl.patchValue({
              product_db_id: product.id,
              product: product.name,
              price: product.price
            });
          }
        });
    });
  }

  updateTotalPrice() {
    const total = this.itemsArray.controls.reduce((sum, itemCtrl) => {
      const quantity = itemCtrl.get('quantity')?.value || 0;
      const price = itemCtrl.get('price')?.value || 0;
      return sum + quantity * price;
    }, 0);
    this.orderForm.patchValue({ total_price: total }, { emitEvent: false });
  }

  deleteSelectedItem() {
    if (this.selectedItemIndex !== null) {
      this.itemsArray.removeAt(this.selectedItemIndex);
      this.selectedItem = null;
      this.selectedItemIndex = null;
    }
  }


}
