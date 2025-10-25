import { Component, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';

// Interfaces
import { ProductPlanInterface } from '../../interface/productPlan.interface';
import { TableColumn } from '../../interface/tablecolumnn.interface';

// Services
import { ProductPlanService } from '../../servicies/productPlan.service';
import { UserService } from '../../servicies/user.service';
import { NotificationService } from '../../servicies/notification.service';

// Components
import { GenericTableComponent } from '../generic-table/generic-table.component';
import { MasterLayoutComponent } from '../master-layout/master-layout.component';
import { NavbarComponent } from '../navbar/navbar.component';
import { SmallNavbarComponent } from '../small-navbar/small-navbar.component';
import { ProductPlanTableComponent } from '../product-plan-table/product-plan-table.component';

@Component({
  selector: 'app-product-plan',
  standalone: true,
  templateUrl: './product-plan.component.html',
  styleUrls: ['./product-plan.component.css'],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatToolbarModule,
    MasterLayoutComponent,
    NavbarComponent,
    SmallNavbarComponent,
    GenericTableComponent,
    ProductPlanTableComponent
  ]
})
export class ProductPlanComponent implements OnInit {

  showModal = false;
  productMenu = [
    { label: 'Hlavny Zoznam', styleClass: 'btn-new navigation', click: () => this.closeModal() },
    { label: 'Zoznam položiek', styleClass: 'btn-popular navigation', click: () => this.openModal() },
  ];

  isLoading = true;
  errorMessage = '';
  objectItems: ProductPlanInterface[] = [];
  itemForm: FormGroup | null = null;
  selectedItem: ProductPlanInterface | null = null;


  columns: TableColumn[] = [
    { key: 'id', label: 'Kód', type: 'number' },
    { key: 'plan_number', label: 'Číslo plánu', type: 'text' },
    { key: 'plan_type', label: 'Perioda plánu', type: 'text' },
    { key: 'start_date', label: 'Plantný od', type: 'text' },
    { key: 'end_date', label: 'Plantný do', type: 'text' },
  ];

  constructor(
    private productPlanService: ProductPlanService,
    private userService: UserService,
    private notify: NotificationService,
    private fb: FormBuilder,
  ) { }

  ngOnInit(): void {
    this.loadAllItems();
  }

  openModal() { this.showModal = true; }
  closeModal() { this.showModal = false; }

  private loadAllItems() {
    if (!this.userService.isLoggedIn()) {
      this.errorMessage = 'Nie ste prihlásený';
      this.isLoading = false;
      return;
    }

    this.isLoading = true;
    this.productPlanService.loadAllProductPlans().subscribe({
      next: items => {
        this.objectItems = items.map(c => ({ ...c }));
        if (this.objectItems.length) {
          this.selectedItem = this.objectItems[0];
          this.initForm(this.selectedItem);
        }
        this.isLoading = false;
      },
      error: err => {
        console.error(err);
        this.errorMessage = 'Nepodarilo sa načítať dáta';
        this.isLoading = false;
      }
    });
  }

  initForm(item?: ProductPlanInterface) {
    this.itemForm = this.fb.group({
      items: this.fb.array(
        item?.items?.map(i =>
          this.fb.group({
            id: [i.id ?? null],
            product_name: [i.product_name ?? '', Validators.required],
            planned_quantity: [i.planned_quantity ?? 0],
            planned_date: [i.planned_date ?? ''],
            status: [i.status ?? 'pending', Validators.required],
            transfered_pcs: [i.transfered_pcs ?? 0],
            ingredients_status: this.fb.array(
              i.ingredients_status?.map(ing =>
                this.fb.group({
                  ingredient: [ing.ingredient],
                  required_qty: [ing.required_qty],
                  available_qty: [ing.available_qty],
                  is_sufficient: [ing.is_sufficient]
                })
              ) || []
            )
          })
        ) || []
      )
    });
  }
  // Stav dropdown pre každý item
  isExpanded: { [key: number]: boolean } = {};

  toggleIngredients(index: number) {
    this.isExpanded[index] = !this.isExpanded[index];
  }

  get itemsFormArray(): FormArray<FormGroup> {
    return (this.itemForm?.get('items') as FormArray<FormGroup>) || new FormArray<FormGroup>([]);
  }

  getIngredientsFormArray(itemGroup: FormGroup): FormArray<FormGroup> {
    const control = itemGroup.get('ingredients_status');
    if (control instanceof FormArray) {
      return control as FormArray<FormGroup>;
    }
    return new FormArray<FormGroup>([]);
  }

  async selectItems(item: ProductPlanInterface) {
    if (this.itemForm?.dirty) {
      const ok = await this.notify.confirm('Máte neuložené zmeny. Chcete ich uložiť?');
      if (ok) {
        this.saveItem();
      } else {
        this.notify.notify('Neuložené zmeny boli zahodené', 'warn');
        this.itemForm.reset(item);
      }
    }

    const selected = this.objectItems.find(i => i.id === item.id) || item;
    this.initForm(selected);
    setTimeout(() => this.selectedItem = selected);
  }

  saveItem() {
    console.log(this.itemForm?.value);
  }

}
