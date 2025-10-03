import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';


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
  selector: 'app-orders-customers',
  standalone: true,
  imports: [CommonModule,
    GenericTableComponent,
    MasterLayoutComponent,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatToolbarModule,
    NavbarComponent],
  templateUrl: './orders-customers.component.html',
  styleUrl: './orders-customers.component.css'
})


export class OrdersCustomersComponent implements OnInit {

  @Output() customerSelected = new EventEmitter<CustomersInterface>();
  @Output() closeDoor = new EventEmitter<void>();
  onClose() { this.closeDoor.emit() }

  // --------------------------
  // --- Stav komponentu ---
  // --------------------------
  isLoading = true; // Indikátor načítania
  errorMessage = ''; // Správa o chybe
  customer: CustomersInterface[] = []; // Pole všetkých
  selectedCustomer: CustomersInterface | null = null; // Aktuálne vybraný zákazník
  customerForm: FormGroup | null = null; // Reactive form pre zákazníka
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
    private filterService: FilterService
  ) { }

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
      },
      error: err => {
        console.error(err);
        this.errorMessage = 'Nepodarilo sa načítať zákazníkov';
        this.isLoading = false;
      }
    });
  }
  /** Výber zákazníka zo zoznamu a kontrola neuložených zmien */



  selectCustomer(customer: CustomersInterface) {
    console.log('Klikol si na zákazníka:', customer);
    this.selectedCustomer = customer;  // zatiaľ si ho len uložíme lokálne
  }

  confirmSelection() {
    if (this.selectedCustomer) {
      this.customerSelected.emit(this.selectedCustomer);  // 
    }
    this.closeDoor.emit()
  }



}






