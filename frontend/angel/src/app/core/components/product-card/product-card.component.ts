import { Component, OnInit, ChangeDetectorRef, HostListener } from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';

import { combineLatest, map, BehaviorSubject, Observable, filter, take } from 'rxjs';

// Interfaces
import { ProductionCard, CheckOrdersResponse } from '../../interface/productCard.interface';
import { TableColumn } from '../../interface/tablecolumnn.interface';

// Services
import { UserService } from '../../servicies/user.service';
import { NotificationService } from '../../servicies/notification.service';
import { ProductCardService } from '../../servicies/product-card.service';
import { StatusService } from '../../servicies/status.service';
import { FilterService } from '../../servicies/filter.service';
import { ProductPlanService } from '../../servicies/productPlan.service';


// Components
import { GenericTableComponent } from '../generic-table/generic-table.component';
import { MasterLayoutComponent } from '../master-layout/master-layout.component';
import { NavbarComponent } from '../navbar/navbar.component';
import { SmallNavbarComponent } from '../small-navbar/small-navbar.component';


import { environment } from '../../../../enviroment/enviroment';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ActivatedRoute, Router } from '@angular/router';
import { RouterModule } from '@angular/router';


@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [
    RouterModule,
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatToolbarModule,
    MasterLayoutComponent,
    MatProgressSpinnerModule,
    NavbarComponent,
    SmallNavbarComponent,
    GenericTableComponent,
    MatProgressSpinnerModule,

  ],
  templateUrl: './product-card.component.html',
  styleUrl: './product-card.component.css'
})
export class ProductCardComponent implements OnInit {

  // -------------------------
  // STATE / PREMENNE
  // -------------------------
  showModal = false;
  isLoading = true;
  errorMessage = '';

  objectItems: ProductionCard[] = [];
  selectedItem: ProductionCard | null = null;
  itemForm: FormGroup | null = null;
  filteredData$: Observable<ProductionCard[]>;
  private filterSubject = new BehaviorSubject<ProductionCard[]>([]); // reaktívny zdroj pre users 
  selectedItemIndex: number | null = null;
  private maxServerIdOnLoad: number = 0;


  public checkOrdersData: CheckOrdersResponse | null = null;
  public isOrdersExpanded: boolean = false;
  initialStatus: string = '';
  openModal() { this.showModal = true; console.log('Modal showModal =', this.showModal); }
  closeModal() { this.showModal = false }



  columns: TableColumn[] = [
    { key: 'id', label: 'Kód', type: 'number' },
    { key: 'card_number', label: 'Číslo karty', type: 'text' },
    { key: 'product_name', label: 'Názov Produktu', type: 'text' },
    { key: 'status', label: 'Status', type: 'text' },
    { key: 'planned_quantity', label: 'PM', fullLabel: 'Plánované množstvo', type: 'text' },
    { key: 'produced_quantity', label: 'VM', fullLabel: 'Vyrobené množstvo', type: 'text' },
    { key: 'production_plan_number', label: 'Číslo plánu', type: 'text' },
  ];

  // -------------------------
  // KONŠTRUKTOR
  // -------------------------
  constructor(
    private productCardService: ProductCardService,
    private userService: UserService,
    private notify: NotificationService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
    private statusService: StatusService,
    private filterService: FilterService,
    private route: ActivatedRoute,
    private router: Router,
    private productPlanService: ProductPlanService,
  ) {
    this.filteredData$ = combineLatest([
      this.filterSubject.asObservable(),
      this.filterService.filters$
    ]).pipe(
      map(([selectedItem, filters]) => {
        if (!filters.length) return selectedItem;
        return selectedItem.filter(selectedItem =>
          filters.every(f =>
            Object.values(selectedItem).some(v =>

              v != null && this.filterService.normalizeFilter(v).includes(f)

            )

          )

        );

      })

    );

  }

  // -------------------------
  // INIT
  // -------------------------
  ngOnInit(): void {
    console.log('%c 🏁 1. PRODUCT CARD: ngOnInit spustený', 'background: #222; color: #bada55');

    this.loadAllItems();
    this.initForm();
    this.loadOrderWarnings();

    // Sledujeme zmeny v URL parametroch
    this.route.queryParamMap.subscribe(params => {
      const planItemIdParam = params.get('planItemId');
      console.log(`   > Hľadám parameter 'planItemId':`, planItemIdParam);

      if (planItemIdParam) {
        const planItemId = parseInt(planItemIdParam, 10);
        console.log(`%c ✅ 3. ID Nájdené a platné: ${planItemId}. Spúšťam logiku prenosu.`, 'color: green; font-weight: bold;');

        if (!isNaN(planItemId)) {
          // 🔥 TU VOLÁME TVOJU FUNKCIU
          this.handlePlanItemSelection(planItemId);

          // Voliteľne: Vyčistíme URL, aby parameter nezostal
          this.router.navigate([], {
            relativeTo: this.route,
            queryParams: { planItemId: null },
            queryParamsHandling: 'merge'
          });
        }
      }
    });

  }

  // -------------------------
  // DATA LOADING FUNCTIONS
  // -------------------------
  private loadAllItems() {
    if (!this.userService.isLoggedIn()) {
      if (!environment.production && environment.debug) console.log('Nie ste prihlásený');
      this.notify.showError('Nie ste prihlásený');
      this.isLoading = false;
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    this.productCardService.loadAllProductCards().subscribe({
      next: (items) => {
        this.objectItems = items.map(c => ({ ...c }));
        const allIds = this.objectItems.map(item => item.id).filter(id => id !== undefined) as number[];
        this.maxServerIdOnLoad = allIds.length > 0 ? Math.max(...allIds) : 0;
        this.filterSubject.next(this.objectItems);
        this.cdr.detectChanges();

        // 👇👇👇 TU JE ZMENA 👇👇👇

        // 1. Zistíme, či v URL existuje parameter 'planItemId' (čiže vytvárame novú kartu)
        const isCreatingFromPlan = this.route.snapshot.queryParamMap.has('planItemId');

        // 2. Zistíme, či už je formulár 'dirty' (či už sme doňho niečo zapísali cez handlePlanItemSelection)
        const isFormDirty = this.itemForm?.dirty;

        // Vyberieme prvú položku LEN VTEDY, ak:
        // a) Máme nejaké položky v zozname
        // b) A ZÁROVEŇ nevytvárame kartu z plánu (!isCreatingFromPlan)
        // c) A ZÁROVEŇ formulár nie je rozpísaný (!isFormDirty)
        if (this.objectItems.length && !isCreatingFromPlan && !isFormDirty) {

          this.selectedItem = this.objectItems[0];
          this.initialStatus = this.selectedItem.status || '';
          this.initForm(this.selectedItem);

        } else if (!this.objectItems.length) {
          // Logika pre prázdny zoznam
          if (!environment.production && environment.debug) console.log('Niesu vybraté žiadne plány');
          // Tu môžeš dať notify, ale pozor, aby to neotravovalo, ak je zoznam len prázdny
        }

        // 👆👆👆 KONIEC ZMENY 👆👆👆

        this.isLoading = false;
      },
      error: (err) => {
        if (!environment.production && environment.debug) console.error('Chyba z API:', err);
        this.notify.showError(err.error?.message || 'Nepodarilo sa načítať dáta');
        this.isLoading = false;
      }
    });
  }

  private loadOrderWarnings() {
    if (!this.userService.isLoggedIn()) {
      if (!environment.production && environment.debug) console.log('Nie ste prihlásený');
      this.notify.showError('Nie ste prihlásený');
      this.isLoading = false;
      return;
    }

    this.isLoading = true;
    this.checkOrdersData = null;

    this.productCardService.loadAllMissingOrders().subscribe({
      next: (data: CheckOrdersResponse) => {
        this.checkOrdersData = data;

        if (this.checkOrdersData.total_warnings > 0) {
          this.notify.showWarning(`Pozor, našlo sa ${this.checkOrdersData.total_warnings} problémov s objednávkami.`);
        } else {
          this.notify.showSuccess('Výroba pokrýva všetky objednávky.');
        }

        this.isLoading = false;
      },
      error: (err) => {
        if (!environment.production && environment.debug) console.error('Chyba z API pri checkOrders:', err);
        this.notify.showError(err.error?.message || 'Nepodarilo sa skontrolovať objednávky');
        this.isLoading = false;
      }
    });
  }

  // -------------------------
  // FORM FUNCTIONS
  // -------------------------
  initForm(item?: ProductionCard) {
    const isNewCard = item?.id === undefined || item?.id === null;

    this.itemForm = this.fb.group({
      id: [item?.id ?? null],
      card_number: [{ value: item?.card_number ?? '', disabled: true }],
      production_plan_number: [{ value: item?.production_plan_number ?? '', disabled: true }],
      product_name: [{ value: item?.product_name ?? '', disabled: true }],
      plan_item_name: [{ value: item?.plan_item_name ?? '', disabled: true }],
      planned_quantity: [{ value: item?.planned_quantity ?? 0, disabled: false }],
      produced_quantity: [item?.produced_quantity ?? 0, [Validators.required, Validators.min(0)]],
      defective_quantity: [item?.defective_quantity ?? 0, [Validators.required, Validators.min(0)]],
      remaining_quantity: [{ value: item?.remaining_quantity ?? 0, disabled: true }],
      status: [item?.status ?? 'pending', Validators.required],
      operator: [item?.operator ?? null],
      operator_name: [{ value: item?.operator_name ?? '', disabled: true }],
      start_time: [item?.start_time ?? null],
      end_time: [item?.end_time ?? null],
      notes: [item?.notes ?? ''],
      stock_receipt_created: [{ value: item?.stock_receipt_created ?? false, disabled: true }],
      created_at: [{ value: item?.created_at ?? '', disabled: true }],
      created_by: [{ value: item?.created_by ?? null, disabled: true }],
      updated_at: [{ value: item?.updated_at ?? '', disabled: true }],
      updated_by: [{ value: item?.updated_by ?? null, disabled: true }],
      production_plan_item_id: [item?.production_plan_item_id ?? null],
      items: this.fb.array([])
    });
  }

  get itemsFormArray(): FormArray {
    return (this.itemForm?.get('items') as FormArray) || new FormArray([]);
  }

  async selectItems(item: ProductionCard) {
    if (this.itemForm?.dirty) {
      const ok = await this.notify.confirm('Máte neuložené zmeny. Chcete ich uložiť?');
      if (!ok) this.notify.notify('Neuložené zmeny boli zahodené', 'warn');
    }

    const selected = this.objectItems.find(i => i.id === item.id) || item;
    this.initForm(selected);
    setTimeout(() => (this.selectedItem = selected));
  }

  // -------------------------
  // SAVE FUNCTION
  // -------------------------
  saveItem() {
    if (!this.itemForm || this.itemForm.invalid) {
      console.warn('Formulár nie je validný.');
      this.notify.showWarning('Formulár nie je validný.');
      return;
    }

    console.log('%c 💾 Ukladám položku...', 'color: blue; font-weight: bold;');

    const formValue = this.itemForm.getRawValue();
    console.log('%c💾 saveItem - formValue:', 'color: purple; font-weight: bold;', formValue);
    const id = formValue.id;

    // --- NOVÁ KARTA (POST) ---
    // --- NOVÁ KARTA (POST) ---
    if (!id) {
      const payload = {
        plan_item_id: formValue.production_plan_item_id,
        planned_quantity: Number(formValue.planned_quantity)
      };
      this.isLoading = true;
      this.productCardService.createProductCard(payload).subscribe({
        next: (createdCard) => {
          this.notify.showSuccess(`Karta ${createdCard.card_number} vytvorená.`);

          // vytvorenie novej referencie poľa
          this.objectItems = [createdCard, ...this.objectItems];

          this.selectedItem = createdCard;
          this.initForm(createdCard);

          // upozorni filter
          this.filterSubject.next([...this.objectItems]);

          this.isLoading = false;
        },
        error: (err) => {
          this.notify.showError('Nepodarilo sa vytvoriť kartu.');
          this.isLoading = false;
        }
      });

      return;
    }

    // --- EDITÁCIA EXISTUJÚCEJ KARTY (PATCH) ---
    const updatePayload = {
      produced_quantity: Number(formValue.produced_quantity),
      defective_quantity: Number(formValue.defective_quantity),
      notes: formValue.notes
    };

    this.isLoading = true;
    this.productCardService.updateProductCard(id, updatePayload).subscribe({
      next: (updatedCard) => {
        this.notify.showSuccess('Zmeny uložené.');

        const index = this.objectItems.findIndex(i => i.id === id);
        if (index !== -1) {
          // vytvorenie novej referencie poľa s aktualizovaným objektom
          this.objectItems = [
            ...this.objectItems.slice(0, index),
            { ...this.objectItems[index], ...updatedCard },
            ...this.objectItems.slice(index + 1)
          ];
          this.selectedItem = this.objectItems[index];

          this.itemForm?.markAsPristine();
          this.filterSubject.next([...this.objectItems]);
        }

        this.isLoading = false;
      },
      error: (err) => {
        this.notify.showError('Chyba pri ukladaní.');
        this.isLoading = false;
      }
    });

  }


  // -------------------------
  // UI HELPERS
  // -------------------------
  public toggleOrders(): void {
    this.isOrdersExpanded = !this.isOrdersExpanded;
  }

  rowClasses = (row: any) => {
    if (!row.status) return '';
    switch (row.status.toLowerCase()) {
      case 'pending': return 'row-pending';
      case 'completed': return 'row-completed';
      case 'in_production': return 'row-processing';
      case 'partially_completed': return 'row-partially_completed';
      case 'canceled': return 'row-canceled';
      default: return '';
    }
  };

  getStatusClass() {
    return this.statusService.getCssClass(this.itemForm?.get('status')?.value);
  }

  selectItemForDelete(index: number) {
    this.selectedItemIndex = index;
    console.log(`Vybraná položka na zmazanie: Index ${index}, ID: ${this.itemsFormArray.at(index).get('id')?.value}`);
  }





  deleteSelectedItem() {
    // 1️⃣ Overenie, či je vybraná položka
    if (!this.selectedItem || !this.selectedItem.id) {
      this.notify.showWarning('Nie je vybraná žiadna položka na zmazanie.');
      return;
    }

    // 2️⃣ Confirm dialog
    this.notify.confirm('Naozaj chcete vymazať túto položku?').then((confirmed) => {
      if (!confirmed) return;

      this.isLoading = true;

      // 3️⃣ Volanie API na vymazanie
      this.productCardService.deleteProductCard(this.selectedItem!.id).subscribe({
        next: (res: any) => {
          // 4️⃣ Správa z backendu
          const msg = res?.detail || res?.message || 'Položka bola úspešne vymazaná';
          this.notify.showSuccess(msg);

          // 5️⃣ Odstránenie zo zoznamu
          this.objectItems = this.objectItems.filter(item => item.id !== this.selectedItem!.id);

          // 6️⃣ Reset selectedItem
          this.selectedItem = this.objectItems.length ? this.objectItems[0] : null;

          // 7️⃣ Inicializácia formulára
          this.initForm(this.selectedItem || undefined);

          this.isLoading = false;
        },
        error: (err) => {
          console.error('Chyba pri mazani:', err);

          let errMsg = 'Nepodarilo sa vymazať položku.';

          if (err.error) {
            if (typeof err.error === 'string') {
              errMsg = err.error;
            } else if (Array.isArray(err.error)) {
              errMsg = err.error.join(', '); // pole -> string
            } else if (err.error.detail) {
              // DRF štandard detail môže byť string alebo pole
              if (typeof err.error.detail === 'string') {
                errMsg = err.error.detail;
              } else if (Array.isArray(err.error.detail)) {
                errMsg = err.error.detail.join(', ');
              }
            } else if (err.error.message) {
              errMsg = err.error.message;
            }
          }

          this.notify.showError(errMsg);
          this.isLoading = false;
        }


      });
    });
  }



  /** 🔹 Zrušenie zmien */
  /** 🔹 Zrušenie zmien (funguje pre Edit aj Create) */
  cancelEdit() {
    // SCENÁR A: Rušíme vytváranie NOVUJ KARTY (selectedItem je null)
    if (!this.selectedItem) {
      this.notify.notify('Vytváranie novej karty bolo zrušené.', 'info');

      // 1. Vyčistíme URL od parametra planItemId
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { planItemId: null },
        queryParamsHandling: 'merge'
      });

      // 2. Ak máme v zozname nejaké existujúce karty, vyberieme prvú
      if (this.objectItems.length > 0) {
        this.selectedItem = this.objectItems[0];
        this.initForm(this.selectedItem);
      } else {
        // Ak zoznam je prázdny, vyčistíme formulár úplne
        this.initForm();
      }
      return;
    }

    // SCENÁR B: Rušíme úpravu EXISTUJÚCEJ KARTY
    this.initForm(this.selectedItem);
    this.itemForm?.markAsPristine();
    this.notify.notify('Zmeny boli zrušené', 'info');
  }


  // ==========================================================
  // 2. LOGIKA PRENOSU (Tvoj presný kód)
  // ==========================================================
  private handlePlanItemSelection(planItemId: number): void {
    console.group('📦 SPRACOVANIE PRENOSU DÁT (ID: ' + planItemId + ')');
    this.isLoading = true;
    let dataFoundInService = false;

    this.productPlanService.selectedPlanItem$.pipe(
      take(1) // Pozrieme sa na aktuálnu hodnotu
    ).subscribe((item) => {

      if (item) {
        // ✅ SCENÁR A: Dáta sú v službe
        dataFoundInService = true;
        console.log("Dáta načítané zo služby.");

        this.prepareFormFromData(item, planItemId);
        this.productPlanService.clearSelectedPlanItem();
      } else {
        // ✅ SCENÁR B: Dáta v službe nie sú (API fallback)
        console.log("Služba je prázdna, spúšťam API fallback...");

        this.productCardService.getPlanItemDetails(planItemId).subscribe({
          next: (apiData) => {
            this.prepareFormFromData(apiData, planItemId);
          },
          error: (err) => {
            this.notify.showError("Nepodarilo sa načítať dáta.");
            this.isLoading = false;
          }
        });
      }
    });
    console.groupEnd();
  }

  // ==========================================================
  // 3. POMOCNÁ METÓDA (Tvoj presný kód)
  // ==========================================================
  private prepareFormFromData(data: any, planItemId: number) {
    console.log('%c 🛠️ Napĺňam formulár dátami:', 'color: purple', data);

    const initialCardData: Partial<ProductionCard> = {
      product_name: data.product_name,
      planned_quantity: data.planned_quantity || data.quantity,
      production_plan_number: data.production_plan_number,
      status: 'pending',
      produced_quantity: 0,
      defective_quantity: 0,
      production_plan_item_id: planItemId,
      // ... ďalšie polia
    };

    this.selectedItem = null; // Režim "Nová karta"
    this.initForm(initialCardData as ProductionCard);

    // this.itemForm?.markAsDirty();
    this.isLoading = false;
    this.notify.showSuccess('Formulár pripravený.');
  }
  get productionPlanNumberControl(): FormControl {
    return this.itemForm?.get('production_plan_number') as FormControl;
  }



}