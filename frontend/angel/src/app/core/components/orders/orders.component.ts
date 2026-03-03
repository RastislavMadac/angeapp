import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { GenericTableComponent } from '../generic-table/generic-table.component';
import { MasterLayoutComponent } from '../master-layout/master-layout.component';
import { NavbarComponent } from '../navbar/navbar.component';
import { SmallNavbarComponent } from '../small-navbar/small-navbar.component';
import { OrderItemsComponent } from '../order-items/order-items.component';
import { TableColumn } from '../../interface/tablecolumnn.interface';
import { OrderInterface } from '../../interface/order.interface';
import { OrderItemInterface } from '../../interface/order-item.interface';
import { OrderService } from '../../servicies/order.service';
import { UserService } from '../../servicies/user.service';
import { NotificationService } from '../../servicies/notification.service';
import { ButtonsService } from '../../servicies/buttons.service';
import { combineLatest, map, BehaviorSubject, Observable } from 'rxjs';
import { FilterService } from '../../servicies/filter.service';

import { Router } from '@angular/router';
import { ExpeditionService } from '../../servicies/expedition.service';
import { IExpedition } from '../../interface/expedition.interface'
@Component({
  selector: 'app-orders',
  templateUrl: './orders.component.html',
  styleUrls: ['./orders.component.css'],
  standalone: true,
  imports: [
    CommonModule,
    GenericTableComponent,
    MasterLayoutComponent,
    NavbarComponent,
    SmallNavbarComponent,
    OrderItemsComponent,
    MatButtonModule,
    MatIconModule,
    MatToolbarModule,
    MatTooltipModule,
    ReactiveFormsModule
  ]
})
export class OrdersComponent implements OnInit {
  isLoading = true;
  errorMessage = '';
  filteredData$: Observable<OrderInterface[]>;

  private filterSubject = new BehaviorSubject<OrderInterface[]>([]);

  // ---- debug-enabled properties (wrappers so môžeme logovať nastavenia) ----
  private _orders: OrderInterface[] = [];
  get orders(): OrderInterface[] { return this._orders; }
  set orders(v: OrderInterface[]) {
    console.groupCollapsed('%c[DEBUG] orders.setter', 'color: purple; font-weight: bold;',
      'new length =', v?.length);
    console.log('orders ids =', v?.map(o => o.id));
    console.trace();
    console.groupEnd();
    this._orders = v;
  }
  selectedOrderItems: OrderItemInterface[] = [];
  private _selectedOrder: OrderInterface | null = null;

  get selectedOrder(): OrderInterface | null {
    return this._selectedOrder;
  }

  set selectedOrder(v: OrderInterface | null) {
    console.group('%c[DEBUG] selectedOrder.setter', 'color: green; font-weight: bold;');
    console.log('old id =', this._selectedOrder?.id, 'new id =', v?.id);

    const foundByRef = v ? this._orders.includes(v) : false;
    const foundById = v ? this._orders.some(o => o.id === v.id) : false;
    console.log('in orders by ref:', foundByRef, 'by id:', foundById);
    console.trace();

    // ✅ Bezpečné nastavenie spreadu
    if (v) {
      this._selectedOrder = {
        ...v,
        customer_id: (v as any).customer_id ?? null
      };
    } else {
      this._selectedOrder = null;
    }

    console.groupEnd();
  }



  orderForm: FormGroup | null = null;
  showModal = false;



  productMenu = [
    { label: 'Hlavny Zoznam', styleClass: 'btn-new navigation', click: () => this.closeModal() },
    { label: 'Zoznam položiek', styleClass: 'btn-popular navigation', click: () => this.openModal() },
    {
      label: 'Expedícia',
      styleClass: 'btn-confirm navigation', // CSS triedu si prispôsob
      click: () => this.createExpeditionFromOrder()
    },
  ];

  columns: TableColumn[] = [
    { key: 'id', label: 'Kód', type: 'number' },
    { key: 'order_number', label: 'Číslo objednávky', type: 'text' },
    { key: 'customer', label: 'Zákazník', type: 'text' },
    { key: 'status', label: 'Stav', type: 'text' },
    { key: 'total_price', label: 'Celková cena', type: 'number' },
    { key: 'created_at', label: 'Dátum vytvorenia', type: 'date' },
    { key: 'created_who', label: 'Vytvoril', type: 'text' },
    { key: 'edited_at', label: 'Dátum úpravy', type: 'date' },
    { key: 'edited_who', label: 'Upravil', type: 'text' },
  ];

  constructor(
    private fb: FormBuilder,
    private orderService: OrderService,
    private userService: UserService,
    private notify: NotificationService,
    private buttonService: ButtonsService,
    private filterService: FilterService,
    private expeditionService: ExpeditionService,
    private router: Router
  ) {
    this.filteredData$ = combineLatest([
      this.filterSubject.asObservable(),
      this.filterService.filters$
    ]).pipe(
      map(([orders, filters]) => {
        if (!filters.length) return orders;
        return orders.filter(orders =>
          filters.every(f =>
            Object.values(orders).some(v =>
              v != null && this.filterService.normalizeFilter(v).includes(f)
            )
          )
        );
      })
    );
  }

  ngOnInit(): void {
    console.log('%c[DEBUG] OrdersComponent ngOnInit', 'color: teal');
    this.loadOrders();
    this.buttonService.add$.subscribe(() => this.createNewOrder());
  }

  // --------------------------
  // Načítanie objednávok
  // --------------------------
  loadOrders() {
    if (!this.userService.isLoggedIn()) {
      this.errorMessage = 'Nie ste prihlásený';
      this.isLoading = false;
      return;
    }

    this.isLoading = true;
    this.orderService.loadAllOrders().subscribe({
      next: orders => {
        console.log('%c[DEBUG] loadAllOrders.next', 'color: purple', 'received ids:', orders.map(o => o.id));
        // nastavíme orders (setter zaloguje)
        this.orders = orders;

        // nastav default iba ak ešte nič nie je vybraté
        if (!this.selectedOrder && this.orders.length > 0) {
          // DÔLEŽITÉ: priradíme PRIAMU REFERENCIU z poľa (nie kópiu)
          this.selectedOrder = this.orders[0];
          console.log('%c[DEBUG] Default selectedOrder assigned to orders[0] id=', 'color: orange', this.selectedOrder?.id);
          this.initForm(this.selectedOrder);
        }
        this.filterSubject.next(this.orders);
        this.isLoading = false;
      },

      error: err => {
        this.errorMessage = 'Nepodarilo sa načítať objednávky';
        this.isLoading = false;
        console.error(err);
      }
    });
  }

  // --------------------------
  // Formulár
  // --------------------------
  initForm(order?: OrderInterface) {
    console.log('%c[DEBUG] initForm called for id =', 'color: navy', order?.id);
    this.orderForm = this.fb.group({
      order_number: [order?.order_number || '', Validators.required],
      customer: [order?.customer || ''],
      total_price: [order?.total_price || ''],
      status: [order?.status || 'pending']
    });
    this.orderForm.markAsPristine();
  }

  // --------------------------
  // Event from MasterLayout two-way binding
  // --------------------------
  onSelectedItemChange(ev: any) {
    console.log('%c[DEBUG] selectedItemChange event from MasterLayout', 'color: blue', ev);
    console.trace();
    // neprepisujeme tu selectedOrder (setter už beží keď Angular two-way asignuje)
  }

  // --------------------------
  // Vybranie objednávky (klik z master/generic)
  // --------------------------
  async selectOrder(order: OrderInterface) {
    console.log('%c[DEBUG] selectOrder called with order:', 'color: purple', order);
    console.log('Current selectedOrder before change:', this.selectedOrder?.id);

    // 🔹 Ak je formulár "dirty", pýtame sa na uloženie zmien
    if (this.orderForm?.dirty) {
      const ok = await this.notify.confirm('Máte neuložené zmeny. Chcete ich uložiť?');
      if (ok) {
        await this.saveOrder();
      } else {
        this.notify.notify('Neuložené zmeny boli zahodené', 'warn');
      }
    }

    // 🔹 DÔLEŽITÉ (debug + oprava): nastavíme PRIAMU referenciu (nie kópiu)
    // Poznámka: ak chceš debugovať pôvodné správanie, zmeň tu späť na { ...order }
    this.selectedOrder = order; // <-- používame referenciu z orders[] (nie kopiu)
    console.log('%c[DEBUG] After assign selectedOrder id =', 'color: green', this.selectedOrder?.id,
      'isRefInOrders =', this._orders.includes(this.selectedOrder as OrderInterface));

    // 🔹 Synchronizujeme formulár (filozofia: initForm nahradí/patched)
    if (!this.orderForm) {
      this.initForm(this.selectedOrder!);
    } else {
      this.orderForm.patchValue({
        order_number: this.selectedOrder?.order_number ?? '',
        customer: this.selectedOrder?.customer ?? '',
        total_price: this.selectedOrder?.total_price ?? '',
        status: this.selectedOrder?.status ?? ''
      });
    }

    this.orderForm?.markAsPristine();
    console.log('%c[DEBUG] selectOrder complete. form value:', 'color: teal', this.orderForm?.value);
  }
  onOrderUpdated(order: OrderInterface) {
    const index = this.orders.findIndex(o => o.id === order.id);
    if (index !== -1) {
      // update existujúcej
      this.orders = [
        ...this.orders.slice(0, index),
        order,
        ...this.orders.slice(index + 1)
      ];
    } else {
      // nová objednávka → pridáme do zoznamu
      this.orders = [...this.orders, order];
    }

    this.selectedOrder = order; // vyberieme práve uloženú objednávku
  }


  // --------------------------
  // Uloženie alebo vytvorenie objednávky
  // --------------------------
  saveOrder() {
    if (!this.orderForm || this.orderForm.invalid) return;

    const payload = { ...this.orderForm.value };

    if (this.selectedOrder) {
      // update
      this.orderService.updateOrder(this.selectedOrder.id!, payload).subscribe({
        next: () => {
          this.loadOrders();
          this.notify.notify('Objednávka bola uložená', 'info');
          this.orderForm?.markAsPristine();
        },
        error: err => console.error(err)
      });
    } else {
      // create
      this.orderService.createOrder(payload).subscribe({
        next: () => {
          this.loadOrders();
          this.notify.notify('Objednávka bola vytvorená', 'info');
          this.orderForm?.markAsPristine();
        },
        error: err => console.error(err)
      });
    }
  }

  createNewOrder() {
    console.log('🟢 Vytváram novú objednávku');

    // ✅ Vytvoríme prázdnu objednávku
    this.selectedOrder = null;
    this.selectedOrderItems = [];

    // ✅ Inicializuj nový formulár (prázdne hodnoty)
    this.initForm({
      order_number: '',
      customer: '',
      total_price: 0,
      status: 'pending'
    } as OrderInterface);

    // ✅ otvor modal (ak chceš najprv formulár, nie rovno položky)
    this.showModal = true;

    // Ak chceš rovno otvoriť modal položiek, nechaj true:
    // this.showModal = true;
  }



  onDeleteOrder(order: OrderInterface) {
    if (!confirm(`Naozaj chcete zmazať objednávku ${order.order_number}?`)) return;
    this.orderService.deleteOrder(order.id!).subscribe({
      next: () => {
        this.orders = this.orders.filter(o => o.id !== order.id);
        if (this.selectedOrder?.id === order.id) this.selectedOrder = null;
        this.orderForm = null;
        this.notify.notify('Objednávka bola zmazaná', 'info');
      },
      error: err => console.error(err)
    });
  }

  // --------------------------
  // Pomocné metódy
  // --------------------------

  closeModal() { this.showModal = false; }

  getRowClass(row: any): string {
    switch (row.status) {
      case 'pending': return 'badge-pending';
      case 'processing': return 'badge-processing';
      case 'completed': return 'badge-completed';
      case 'canceled': return 'badge-canceled';
      default: return '';
    }
  }




  async openModal() {
    if (!this.selectedOrder) return;

    try {
      const order = await this.orderService.getOrder(this.selectedOrder.id!).toPromise();
      if (!order) return; // ešte raz bezpečnostná kontrola
      this.selectedOrder = order;
      this.selectedOrderItems = order.items ?? [];
    } catch (err) {
      console.error('Nepodarilo sa načítať detail objednávky:', err);
    }
    this.showModal = true;
  }

  closeOrderModal() {
    this.showModal = false;
    this.selectedOrderItems = [];
  }

  createExpeditionFromOrder() {
    if (!this.selectedOrder) {
      this.notify.notify('Musíte najprv vybrať objednávku!', 'error');
      return;
    }

    this.notify.confirm(`Chcete vytvoriť expedíciu pre objednávku ${this.selectedOrder.order_number}?`)
      .then((confirmed) => {
        if (confirmed) {
          this.isLoading = true;

          // Pripravíme payload - backend očakáva ID objednávky
          const payload: any = {
            order: this.selectedOrder!.id,
            status: 'draft'
            // Backend by mal automaticky dotiahnuť items z objednávky
          };

          this.expeditionService.createExpedition(payload).subscribe({
            next: (newExpedition: IExpedition) => {
              this.notify.notify('Expedícia vytvorená', 'success');
              this.isLoading = false;

              // Presmerovanie na ExpeditionsComponent a otvorenie novej expedície
              // Používame queryParams 'openId', ktoré sme naprogramovali v minulom kroku
              this.router.navigate(['/expeditions'], {
                queryParams: { openId: newExpedition.id }
              });
            },
            error: (err) => {
              console.error(err);
              // Ošetríme chybu, ak už expedícia existuje (záleží od backendu)
              if (err.status === 400 && err.error?.order) {
                this.notify.notify('Pre túto objednávku už expedícia existuje!', 'error');
              } else {
                this.notify.notify('Nepodarilo sa vytvoriť expedíciu', 'error');
              }
              this.isLoading = false;
            }
          });
        }
      });
  }

}
