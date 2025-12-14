import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { combineLatest, map, BehaviorSubject, Observable } from 'rxjs';

// Interfaces
import { CustomersInterface } from '../../interface/customer.interface';
import { TableColumn } from '../../interface/tablecolumnn.interface';

// Services
import { CustomerService } from '../../servicies/customers.service';
import { UserService } from '../../servicies/user.service';
import { NotificationService } from '../../servicies/notification.service';
import { FilterService } from '../../servicies/filter.service';

// Components
import { GenericTableComponent } from '../generic-table/generic-table.component';
import { MasterLayoutComponent } from '../master-layout/master-layout.component';
import { NavbarComponent } from '../navbar/navbar.component';

@Component({
  selector: 'app-customers',
  standalone: true,
  templateUrl: './customers.component.html',
  styleUrls: ['./customers.component.css'],
  imports: [
    CommonModule,
    GenericTableComponent,
    MasterLayoutComponent,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatToolbarModule,
    NavbarComponent
  ]
})
export class CustomersComponent implements OnInit {

  // --------------------------
  // --- Stav komponentu ---
  // --------------------------
  isLoading = true; // Indikátor načítania
  errorMessage = ''; // Správa o chybe
  customer: CustomersInterface[] = []; // Pole všetkých zákazníkov
  selectedCustomer: CustomersInterface | null = null; // Aktuálne vybraný zákazník
  customerForm: FormGroup | null = null; // Reactive form pre zákazníka

  filteredData$: Observable<CustomersInterface[]>;
  private filterSubject = new BehaviorSubject<CustomersInterface[]>([]);

  columns: TableColumn[] = [
    { key: 'id', label: 'Kód', type: 'number' },
    { key: 'internet_id', label: 'Internet kód', type: 'text' },
    { key: 'name', label: 'Názov', type: 'text' },
    { key: 'address', label: 'Adresa', type: 'text' },
    { key: 'postal_code', label: 'PSČ', type: 'text' },
    { key: 'city', label: 'Mesto', type: 'text' },
    { key: 'delivery_address', label: 'Dodacia adresa', type: 'text' },
    { key: 'delivery_city', label: 'Dodacie mesto', type: 'text' },
    { key: 'delivery_postal_code', label: 'Dodacie PSČ', type: 'text' },
    { key: 'is_legal_entity', label: 'Právnická osoba', type: 'boolean' },
    { key: 'ico', label: 'IČO', type: 'text' },
    { key: 'dic', label: 'DIČ', type: 'text' },
    { key: 'ic_dph', label: 'IČ DPH', type: 'text' },
    { key: 'phone', label: 'Telefón', type: 'text' },
    { key: 'email', label: 'Email', type: 'text' },
    { key: 'website', label: 'Web', type: 'text' }
  ];

  // --------------------------
  // --- Konstruktor ---
  // --------------------------
  constructor(
    private customerService: CustomerService,
    private userService: UserService,
    private fb: FormBuilder,
    private notify: NotificationService,
    private filterService: FilterService,
    private cdr: ChangeDetectorRef
  ) {
    this.filteredData$ = combineLatest([
      this.filterSubject.asObservable(),
      this.filterService.filters$
    ]).pipe(
      map(([customer, filters]) => {

        if (!filters.length) return customer;




        return customer.filter(customer =>

          filters.every(f =>

            Object.values(customer).some(v =>

              v != null && this.filterService.normalizeFilter(v).includes(f)

            )

          )

        );

      })

    );

  }

  // --------------------------
  // --- Lifecycle hook ---
  // --------------------------
  ngOnInit(): void {
    this.loadCustomers();
  }

  // ==========================
  // === CRUD LOGIKA ==========
  // ==========================

  /** Načíta všetkých zákazníkov zo servera */
  private loadCustomers() {
    if (!this.userService.isLoggedIn()) {
      this.errorMessage = 'Nie ste prihlásený';
      this.isLoading = false;
      return;
    }

    this.isLoading = true;
    this.customerService.loadAllCustomers().subscribe({
      next: customers => {
        this.customer = customers.map(c => ({ ...c }));
        this.isLoading = false;
        this.filterSubject.next(this.customer);
      },
      error: err => {
        console.error(err);
        this.errorMessage = 'Nepodarilo sa načítať zákazníkov';
        this.isLoading = false;
      }
    });
  }

  /** Uloží zmeny existujúceho alebo nového zákazníka */
  saveCustomer() {
    if (!this.customerForm || this.customerForm.invalid) return;

    const formValue = this.customerForm.value;
    const dirtyPayload: any = {};

    // Zbieranie len zmien
    Object.keys(this.customerForm.controls).forEach(key => {
      const control = this.customerForm!.controls[key];
      if (control.dirty) dirtyPayload[key] = control.value;
    });

    // Update existujúceho zákazníka
    if (this.selectedCustomer?.id) {
      this.customerService.updateCustomer(this.selectedCustomer.id, dirtyPayload).subscribe({
        next: res => {
          this.loadCustomers();
          this.notify.notify('Zákazník bol uložený', 'info');
          this.customerForm?.markAsPristine();
        },
        error: err => console.error(err)
      });
    }
    // Vytvorenie nového zákazníka
    else {
      this.customerService.createCustomer(formValue).subscribe({
        next: res => {
          this.loadCustomers();
          this.notify.notify('Nový zákazník bol vytvorený', 'info');
          this.customerForm?.markAsPristine();
        },
        error: err => console.error(err)
      });
    }
  }

  /** Zmaže zákazníka zo servera */
  deleteCustomer(customer: CustomersInterface | null) {
    if (!customer) return;

    if (!confirm(`Naozaj chcete zmazať zákazníka ${customer.name}?`)) return;

    this.customerService.deletecustomer(customer.id).subscribe({
      next: () => {
        this.loadCustomers();
        if (this.selectedCustomer?.id === customer.id) this.selectedCustomer = null;
        this.customerForm = null;
        this.selectedCustomer = null;
        this.notify.notify('Zákazník bol zmazaný', 'info');
      },
      error: err => console.error('Chyba pri mazání zákazníka', err)
    });
  }

  // Lokálne odstránenie zo zoznamu (bez servera)
  onDeleteCustomer(customer: CustomersInterface) {
    this.customer = this.customer.filter(c => c.id !== customer.id);
    this.selectedCustomer = null;
  }

  // ==========================
  // === UI LOGIKA ============
  // ==========================

  /** Inicializácia alebo reset formulára zákazníka */
  initForm(customer?: CustomersInterface) {
    this.customerForm = this.fb.group({
      id: [customer?.id || null],
      is_legal_entity: [customer?.is_legal_entity ?? true],
      internet_id: [customer?.internet_id || '', Validators.required],
      ico: [customer?.ico || ''],
      dic: [customer?.dic || ''],
      ic_dph: [customer?.ic_dph || ''],
      name: [customer?.name || '', Validators.required],
      address: [customer?.address || '', Validators.required],
      city: [customer?.city || '', Validators.required],
      postal_code: [customer?.postal_code || ''],
      delivery_address: [customer?.delivery_address || ''],
      delivery_city: [customer?.delivery_city || ''],
      delivery_postal_code: [customer?.delivery_postal_code || ''],
      phone: [customer?.phone || ''],
      email: [customer?.email || '', Validators.email],
      website: [customer?.website || '', Validators.pattern(/https?:\/\/.+/)]
    });
  }

  /** Príprava formulára pre nového zákazníka */
  createNewCustomer() {
    this.selectedCustomer = null;
    this.initForm();
  }

  /** Výber zákazníka zo zoznamu a kontrola neuložených zmien */
  async selectCustomer(customer: CustomersInterface) {
    console.log('Klikol si na zákazníka:', customer);

    if (this.customerForm?.dirty) {
      const ok = await this.notify.confirm('Máte neuložené zmeny. Chcete ich uložiť?');
      if (ok) {
        await this.saveCustomer();
      } else {
        this.notify.notify('Neuložené zmeny boli zahodené', 'warn');
        this.customerForm.reset(customer);
      }
    }

    this.selectedCustomer = this.customer.find(c => c.id === customer.id) || customer;
    this.initForm(this.selectedCustomer);
    this.cdr.detectChanges();// <--- PRIDAŤ ChangeDetectorRef
  }
}
