import { Component, OnInit, Output, Input, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { OrderInterface } from '../../interface/order.interface';
import { OrderItemInterface } from '../../interface/order-item.interface';
import { CustomerService } from '../../servicies/customers.service';
import { OrderService } from '../../servicies/order.service';
import { debounceTime, distinctUntilChanged, switchMap, catchError, of, Subscription, Observable, map } from 'rxjs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { OrdersCustomersComponent } from '../orders-customers/orders-customers.component';
import { CustomersInterface } from '../../interface/customer.interface';
import { NavbarComponent } from '../navbar/navbar.component';
import { ButtonsService } from '../../servicies/buttons.service';
import { OrdersProductComponent } from '../orders-product/orders-product.component';
import { Product } from '../../interface/product.interface';


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
    NavbarComponent,
    OrdersProductComponent],
  templateUrl: './order-items.component.html',
  styleUrls: ['./order-items.component.css']
})
export class OrderItemsComponent implements OnInit, OnChanges {
  @Output() close = new EventEmitter<void>();               // 🔹 Event, ktorý oznámi rodičovi, že sa má modal zavrieť
  @Input() order: OrderInterface | null = null;             // 🔹 Aktuálna objednávka, ktorú editujeme
  @Input() items: OrderItemInterface[] = [];                // 🔹 Položky objednávky (riadky s produktmi)
  @Output() updated = new EventEmitter<OrderInterface>();   // 🔹 Event, ktorým posielame rodičovi aktualizovanú objednávku
  orderForm!: FormGroup;                                    // 🔹 Reactive Form pre základné údaje objednávky
  itemsForm!: FormGroup;
  // 🔹 
  constructor(private fb: FormBuilder,
    private productService: OrderService,
    private buttonService: ButtonsService,
    private customerService: CustomerService) { }

  allCustomers: { id: number; name: string; }[] = [];
  selectedCustomer: CustomersInterface | null = null;
  selectedProduct: Product | null = null;
  selectedItem: any = null;
  selectedItemIndex: number | null = null;
  @Output() addProductClicked = new EventEmitter<void>();
  private subs = new Subscription();

  showModal = false;
  showModalProduct = false;

  selectItem(item: any, index: number) {
    this.selectedItem = item;
    this.selectedItemIndex = index;
    console.log("this.selectedItem", this.selectedItem);
    console.log("this.selectedItemIndex", this.selectedItemIndex);
  }


  // pri výbere zákazníka z modalu
  onProductSelected(product: Product) {
    console.log('✅ Vybraný produkt:', product);
    this.addNewItem(product);
    this.closeModalProduct();
  }
  addNewItem(product: Product): void {
    if (!product) return;

    // pretypovanie price_no_vat na číslo
    const price = typeof product.price_no_vat === 'string'
      ? parseFloat(product.price_no_vat)
      : product.price_no_vat;

    // Skontroluj, či produkt už nie je pridaný
    const exists = this.itemsArray.value.some(
      (i: any) => i.product_db_id === product.id
    );
    if (exists) {
      alert(`Produkt "${product.product_name}" je už pridaný.`);
      return;
    }

    // Vytvor nový riadok vo formulári
    const newItem = this.fb.group({
      product_db_id: [product.id],
      product_code: [product.product_id],
      product: [product.product_name],
      quantity: [1],
      price: [price],
      total_price: [1 * price]   // 1 * price
    });

    this.itemsArray.push(newItem);

    // automatický prepočet ceny
    newItem.valueChanges.subscribe(() => {
      this.updateRowTotal(newItem);
      this.updateTotalPrice();
    });

    this.updateTotalPrice();
  }

  // Prepočet ceny pre jeden riadok
  updateRowTotal(itemGroup: FormGroup): void {
    const quantity = itemGroup.get('quantity')?.value || 0;
    const price = itemGroup.get('price')?.value || 0;
    const total = quantity * price;
    itemGroup.patchValue({ total_price: total }, { emitEvent: false });
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
  openModalProduct() { this.showModalProduct = true; console.log('Modal showModalProduct =', this.showModalProduct); }
  closeModalProduct() { this.showModalProduct = false }

  //🔹 Modal Okno
  openModal() { this.showModal = true; console.log('Modal showModal =', this.showModal); }
  closeModal() { this.showModal = false }


  ngOnDestroy(): void {
    this.subs.unsubscribe();
    console.log("🧹 Odhlásený všetky buttonService subscribes");
  }

  // 🔹 Spustí sa pri prvom načítaní komponentu
  ngOnInit(): void {
    document.body.classList.add('modal-open');
    this.loadDetails();
    this.setupLiveProductLoading();

    // 🔹 DELETE tlačidlo
    this.buttonService.delete$.subscribe(() => {
      console.log("🗑️ DELETE z buttonService zachytené");
      this.deleteSelectedItem();
    });

    // 🔹 SAVE tlačidlo
    this.buttonService.save$.subscribe(() => {
      console.log("💾 SAVE z buttonService zachytené");
      this.saveItems();
    });

    // 🔹 ADD tlačidlo
    this.buttonService.add$.subscribe(() => {
      console.log("➕ ADD z buttonService zachytené");
      this.openModalProduct(); // odstrániť podmienku if
    });

  }


  // 🔹 Reaguje na zmeny Inputov (napr. keď items prídu oneskorene)
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['items'] && !changes['items'].firstChange) {
      this.loadDetails();             // ak sa zmenia položky, znova postavíme formuláre
      this.setupLiveProductLoading(); // a znovu nastavíme live vyhľadávanie
    }
  }




  loadDetails() {
    // FormGroup pre základné údaje objednávky
    this.orderForm = this.fb.group({
      order_number: [this.order?.order_number ?? '', Validators.required],
      customer_id: [null, Validators.required],
      customer_name: [this.order?.customer ?? '', Validators.required],
      status: [(this.order?.status ?? 'pending').toLowerCase()],

      total_price: [this.order?.total_price ?? 0, Validators.min(0)]
    });
    // 🔹 Ak máš informáciu o customer_id z iného miesta, nastav ho
    // Napr. ak používaš selectedCustomer
    if (this.selectedCustomer) {
      this.orderForm.patchValue({ customer_id: this.selectedCustomer.id });
    }


    // FormArray pre položky objednávky
    this.itemsForm = this.fb.group({
      items: this.fb.array(
        (this.items ?? []).map(item =>
          this.fb.group({
            order_item_id: [item.id || null],
            product_db_id: [item.product_id || null],
            product_code: [item.product_code || ''],
            product: [item.product || '', Validators.required],
            quantity: [item.quantity || 1, [Validators.required, Validators.min(1)]],
            price: [item.price || 0, [Validators.required, Validators.min(0)]],
            total_price: [(item.quantity || 1) * (item.price || 0)]
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


  getCustomerId(): Observable<number | null> {
    if (this.orderForm.value.customer_id) {
      console.log("🔹 Používam customer_id z formulára:", this.orderForm.value.customer_id);
      return of(this.orderForm.value.customer_id);
    } else if (this.order?.customer) {
      console.log("🔹 Hľadám customer_id pre meno zákazníka:", this.order.customer);
      return this.customerService.loadAllCustomers().pipe(
        map(customers => {
          console.log("🔹 Načítaní všetci zákazníci:", customers);

          // vytvoríme Mapu: key = meno zákazníka, value = id
          const customerMap = new Map(customers.map(c => [c.name, c.id]));

          // kontrola, či sa meno order.customer nachádza v mape
          const id = Array.from(customerMap.keys()).find(name =>
            this.order?.customer?.includes(name)
          );

          const customerId = id ? customerMap.get(id) ?? null : null;

          console.log("🔹 Nájde sa customerObj:", id);
          console.log("🔹 Použité customer_id:", customerId);

          return customerId;
        })

      );
    } else {
      console.log("⚠️ Nie je k dispozícii ani order.customer ani orderForm.value.customer_id");
      return of(null);
    }
  }



  // PATCH objednávky
  saveItems(): void {
    console.log("🟡 SAVEITEMS SPUSTENA");
    console.log('Order ID:', this.order?.id);

    if (!this.orderForm || !this.itemsForm) {
      console.warn("❌ Formuláre nie sú inicializované, ukladanie zastavené.");
      return;
    }
    this.getCustomerId().subscribe(customerId => {
      if (!customerId) {
        console.warn("❌ Nebolo možné určiť customer_id, ukladanie zastavené.");
        return;
      }
      // Poskladanie payloadu pre PATCH/POST
      const payload = {
        status: this.orderForm.value.status ?? 'pending',
        customer_id: customerId,
        total_price: this.orderForm.value.total_price ?? 0,
        items: this.itemsArray.controls.map(ctrl => ({
          id: ctrl.get('order_item_id')?.value || null,
          product_id: ctrl.get('product_db_id')?.value,
          quantity: ctrl.get('quantity')?.value,
          price: ctrl.get('price')?.value
        }))
      };

      console.log("📦 Payload pripravený na odoslanie:", payload);

      if (this.order?.id) {
        // ✅ PATCH – update existujúcej objednávky
        this.productService.updateOrder(this.order.id, payload).subscribe({
          next: (res) => {
            console.log("✅ Objednávka úspešne aktualizovaná (PATCH):", res);
            this.updated.emit(res);  // späť do rodiča
            this.orderForm.markAsPristine();
            this.itemsForm.markAsPristine();
            this.close.emit();
          },
          error: (err) => console.error("❌ Chyba pri PATCH objednávky:", err)
        });
      } else {
        // ⚡ POST – nová objednávka
        console.log("⚡ Vytvárame novú objednávku (POST)");
        this.productService.createOrder(payload).subscribe({
          next: (res) => {
            console.log("✅ Objednávka úspešne vytvorená (POST):", res);
            this.updated.emit(res); // späť do rodiča → pridáme do zoznamu
            this.orderForm.markAsPristine();
            this.itemsForm.markAsPristine();
            this.close.emit();
          },
          error: (err) => console.error("❌ Chyba pri POST objednávky:", err)
        });
      }
    });
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


  // Prepočet celkovej ceny objednávky
  updateTotalPrice(): void {
    const total = this.itemsArray.controls.reduce((sum, ctrl) => {
      const rowTotal = ctrl.get('quantity')?.value * ctrl.get('price')?.value || 0;
      return sum + rowTotal;
    }, 0);

    console.log(`💰 Celková cena objednávky: ${total} €`);
    this.orderForm.patchValue({ total_price: total }, { emitEvent: false });
  }



  deleteSelectedItem() {
    if (this.selectedItemIndex !== null) {
      this.itemsArray.removeAt(this.selectedItemIndex);
      this.selectedItem = null;
      this.selectedItemIndex = null;
    }
    // 🔹 prepočet total_price po odstránení položky
    this.updateTotalPrice();
  }


}

