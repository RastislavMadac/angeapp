import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray } from '@angular/forms';
import { Router } from '@angular/router';
import { BehaviorSubject, combineLatest, map, Observable } from 'rxjs';

// Material & UI
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

// Interfaces
import { PlanItemForCard, ProductPlanInterface, ProductPlanProductsInterface } from '../../interface/productPlan.interface';
import { TableColumn } from '../../interface/tablecolumnn.interface';

// Services
import { ProductPlanService } from '../../servicies/productPlan.service';
import { UserService } from '../../servicies/user.service';
import { NotificationService } from '../../servicies/notification.service';
import { FilterService } from '../../servicies/filter.service';

// Layout Components
import { GenericTableComponent } from '../generic-table/generic-table.component';
import { MasterLayoutComponent } from '../master-layout/master-layout.component';
import { NavbarComponent } from '../navbar/navbar.component';
import { SmallNavbarComponent } from '../small-navbar/small-navbar.component';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-production-card-plans',
  standalone: true,
  imports: [
    GenericTableComponent,
    MasterLayoutComponent,
    NavbarComponent,
    SmallNavbarComponent,
    MatProgressSpinnerModule,
    CommonModule,
    ReactiveFormsModule,
    MatIconModule,
    MatButtonModule
  ],
  templateUrl: './production-card-plans.component.html',
  styleUrls: ['./production-card-plans.component.css']
})
export class ProductionCardPlansComponent implements OnInit {

  // UI State
  isLoading = true;
  showModal = false;
  errorMessage = '';

  // Data State - Hlavné plány
  objectItems: ProductPlanInterface[] = [];

  // ✅ Data State - Produkty (Pridané podľa požiadavky)
  objectItemsProduct: any[] = [];

  selectedItem: ProductPlanInterface | null = null;
  filteredData$: Observable<ProductPlanInterface[]>;

  // Form (len na zobrazenie)
  itemForm: FormGroup | null = null;

  // Filter
  private filterSubject = new BehaviorSubject<ProductPlanInterface[]>([]);

  // Konfigurácia tabuľky
  columns: TableColumn[] = [
    { key: 'id', label: 'Kód', type: 'number' },
    { key: 'plan_number', label: 'Číslo plánu', type: 'text' },
    { key: 'start_date', label: 'Platný od', type: 'text' },
    { key: 'end_date', label: 'Platný do', type: 'text' },
  ];

  constructor(
    private productPlanService: ProductPlanService,
    private userService: UserService,
    private notify: NotificationService,
    private fb: FormBuilder,
    private router: Router,
    private filterService: FilterService,
  ) {
    // Pipeline pre filtrovanie tabuľky
    this.filteredData$ = combineLatest([
      this.filterSubject.asObservable(),
      this.filterService.filters$
    ]).pipe(
      map(([objectItems, filters]) => {
        if (!filters.length) return objectItems;
        return objectItems.filter(item =>
          filters.every(f =>
            Object.values(item).some(v =>
              v != null && this.filterService.normalizeFilter(v).includes(f)
            )
          )
        );
      })
    );
  }

  ngOnInit(): void {
    this.loadAllItems();
    this.loadAllItemsProduct();
    this.productPlanService.selectedPlanItem$.subscribe(item => {
      if (item) {
        this.createNewCardFromPlan(item);
        this.productPlanService.clearSelectedPlanItem(); // aby sa neprenášalo stále
      }
    });
  }

  onClose() {
    this.router.navigate(['/productCard']);
  }

  // -------------------------------------------------------------------------
  // #region 1. Načítanie položiek produktov (Pridané)
  // -------------------------------------------------------------------------
  private loadAllItemsProduct() {
    if (!this.userService.isLoggedIn()) {
      return;
    }

    // Poznámka: Tu nezapíname isLoading = true, aby sme nepreblikávali 
    // hlavný loader, ktorý rieši loadAllItems().

    this.productPlanService.loadItemPlans().subscribe({
      next: (items) => {
        // Iba uložíme dáta do poľa (žiadne výpočty ID pre editáciu)
        this.objectItemsProduct = items.map((c) => ({ ...c }));

        console.log('Načítané pomocné produkty:', this.objectItemsProduct);
      },
      error: (err) => {
        // Voliteľné: Zobraziť chybu alebo len logovať
        console.error('Chyba pri načítaní loadItemPlans:', err);
      }
    });
  }
  // #endregion

  // -------------------------------------------------------------------------
  // #region 2. Načítanie hlavných plánov (READ ONLY)
  // -------------------------------------------------------------------------
  private loadAllItems() {
    if (!this.userService.isLoggedIn()) {
      this.notify.showError('Nie ste prihlásený');
      this.isLoading = false;
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    this.productPlanService.loadAllProductFileteredPlans().subscribe({
      next: (items) => {
        this.objectItems = items.map((c) => ({ ...c }));
        this.filterSubject.next(this.objectItems);

        if (this.objectItems.length) {
          this.selectedItem = this.objectItems[0];
          // Voliteľné: Hneď inicializovať formulár pre prvý prvok
          // this.initForm(this.selectedItem); 
        } else {
          this.notify.showError('Nie sú dostupné žiadne plány');
        }

        this.isLoading = false;
      },
      error: (err) => {
        this.notify.showError(err.error?.message || 'Nepodarilo sa načítať dáta');
        this.isLoading = false;
      },
    });
  }
  // #endregion

  // -------------------------------------------------------------------------
  // #region 3. Výber položky (SELECT)
  // -------------------------------------------------------------------------
  selectItems(item: ProductPlanInterface) {
    this.selectedItem = item;
    this.initForm(this.selectedItem);
  }
  // #endregion

  // -------------------------------------------------------------------------
  // #region 4. Inicializácia Formulára (DISPLAY ONLY)
  // -------------------------------------------------------------------------
  initForm(item?: ProductPlanInterface) {
    this.itemForm = this.fb.group({
      id: [{ value: item?.id ?? null, disabled: true }],
      plan_number: [{ value: item?.plan_number ?? '', disabled: true }],
      plan_type: [{ value: item?.plan_type ?? '', disabled: true }],
      start_date: [{ value: item?.start_date ?? '', disabled: true }],
      end_date: [{ value: item?.end_date ?? '', disabled: true }],

      items: this.fb.array(
        item?.items?.map((i) =>
          this.fb.group({
            id: [{ value: i.id ?? null, disabled: true }],
            product: [{ value: i.product ?? '', disabled: true }],
            product_id: [{ value: i.product_id ?? '', disabled: true }],
            product_name: [{ value: i.product_name ?? '', disabled: true }],
            planned_quantity: [{ value: i.planned_quantity ?? 0, disabled: true }],
            planned_date: [{ value: i.planned_date ?? '', disabled: true }],
            status: [{ value: i.status ?? 'pending', disabled: true }],
            transfered_pcs: [{ value: i.transfered_pcs ?? 0, disabled: true }],

            ingredients_status: this.fb.array(
              i.ingredients_status?.map((ing) =>
                this.fb.group({
                  ingredient: [{ value: ing.ingredient, disabled: true }],
                  required_qty: [{ value: ing.required_qty, disabled: true }],
                  available_qty: [{ value: ing.available_qty, disabled: true }],
                  is_sufficient: [{ value: ing.is_sufficient, disabled: true }],
                })
              ) || []
            ),
          })
        ) || []
      ),
    });
  }

  get itemsFormArray(): FormArray<FormGroup> {
    return (this.itemForm?.get('items') as FormArray<FormGroup>) || new FormArray<FormGroup>([]);
  }
  // #endregion

  // -------------------------------------------------------------------------
  // #region 5. Helpery pre UI
  // -------------------------------------------------------------------------
  getItemClass(itemGroup: any): string {
    const status = itemGroup.get('status')?.value;
    switch (status) {
      case 'pending': return 'item-badge-pending';
      case 'in_production': return 'item-badge-processing';
      case 'partially completed': return 'item-badge-partially';
      case 'completed': return 'item-badge-completed';
      case 'canceled': return 'item-badge-canceled';
      default: return '';
    }
  }

  getRowClass(row: any): string {
    const items = row.items;
    if (!items || items.length === 0) return 'badge-no-items';

    const hasCanceled = items.some((item: any) => item.status === 'canceled');
    const hasInProduction = items.some((item: any) => item.status === 'in_production');
    const hasPending = items.some((item: any) => item.status === 'pending');
    const hasPartiallyCompleted = items.some((item: any) => item.status === 'partially completed');
    const allCompleted = items.every((item: any) => item.status === 'completed');

    if (hasCanceled) return 'badge-canceled';
    if (hasInProduction) return 'badge-processing';
    if (hasPending) return 'badge-pending';
    if (hasPartiallyCompleted) return 'badge-processing ';
    if (allCompleted) return 'badge-completed';

    return 'badge-mixed-status';
  }
  // #endregion

  createNewCardFromPlan(planItem: PlanItemForCard) {
    this.selectedItem = null;

    this.itemForm = this.fb.group({
      id: [null],
      product_name: [planItem.product_name],
      card_number: [''],
      production_plan_number: [planItem.production_plan_number ?? ''],
      planned_quantity: [planItem.planned_quantity],
      produced_quantity: [0],
      defective_quantity: [0],
      status: ['pending'],
      notes: ['']
    });

    console.log('🛠️ Napĺňam formulár dátami:', this.itemForm.value);
  }





  // ProductionCardPlansComponent.ts

  selectPlanItemToCreateCard(itemData: any): void {
    // itemData už obsahuje plan_number
    this.productPlanService.setSelectedPlanItem(itemData);

    this.router.navigate(['/productCard'], {
      queryParams: { planItemId: itemData.id }
    });
  }



}