import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { CustomersInterface } from '../../interface/customer.interface';
import { TableColumn } from '../../interface/tablecolumnn.interface';
import { CustomerService } from '../../servicies/customers.service';
import { UserService } from '../../servicies/user.service';
import { NotificationService } from '../../servicies/notification.service';
import { FilterService } from '../../servicies/filter.service';
import { CommonModule } from '@angular/common';
import { GenericTableComponent } from '../generic-table/generic-table.component';
import { MasterLayoutComponent } from '../master-layout/master-layout.component';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NavbarComponent } from '../navbar/navbar.component';

@Component({
  selector: 'app-customers',
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

  isLoading = true;
  errorMessage = '';
  customer: CustomersInterface[] = [];
  selectedCustomer: CustomersInterface | null = null;
  customerForm: FormGroup | null = null;

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

  constructor(
    private customerService: CustomerService,
    private userService: UserService,
    private fb: FormBuilder,
    private notify: NotificationService,
    private filterService: FilterService
  ) { }

  ngOnInit(): void {
    this.loadCustomers();
  }

  private loadCustomers() {
    if (!this.userService.isLoggedIn()) {
      this.errorMessage = 'Nie ste prihlásený';
      this.isLoading = false;
      return;
    }

    this.isLoading = true;
    this.customerService.loadAllCustomers().subscribe({
      next: customers => {
        this.customer = customers.map(c => ({ ...c })); // mapovanie na istotu
        this.isLoading = false;
      },
      error: err => {
        console.error(err);
        this.errorMessage = 'Nepodarilo sa načítať zákazníkov';
        this.isLoading = false;
      }
    });
  }

  createNewCustomer() {
    this.selectedCustomer = null;
    this.initForm();
  }

  onDeleteCustomer(customer: CustomersInterface) {
    this.customer = this.customer.filter(c => c.id !== customer.id);
    this.selectedCustomer = null;
  }

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

    // nastavenie vybraného zákazníka zo zoznamu, aby sa zvýraznil aj vizuálne
    this.selectedCustomer = this.customer.find(c => c.id === customer.id) || customer;
    this.initForm(this.selectedCustomer);
  }

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

  saveCustomer() {
    if (!this.customerForm || this.customerForm.invalid) return;

    const formValue = this.customerForm.value;
    const dirtyPayload: any = {};
    Object.keys(this.customerForm.controls).forEach(key => {
      const control = this.customerForm!.controls[key];
      if (control.dirty) dirtyPayload[key] = control.value;
    });

    if (this.selectedCustomer?.id) {
      this.customerService.updateCustomer(this.selectedCustomer.id, dirtyPayload).subscribe({
        next: res => {
          this.loadCustomers();
          this.notify.notify('Zákazník bol uložený', 'info');
          this.customerForm?.markAsPristine();
        },
        error: err => console.error(err)
      });
    } else {
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
}
