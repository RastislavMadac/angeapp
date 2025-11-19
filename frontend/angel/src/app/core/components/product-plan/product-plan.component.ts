import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CommonModule, formatDate } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Observable, Subscription, debounceTime, distinctUntilChanged, filter, forkJoin, of, switchMap } from 'rxjs';

// Interfaces
import { ProductFromModal, ProductPlanInterface, ProductPlanItemForm, ProductPlanItemsInterface, ProductPlanProductsInterface } from '../../interface/productPlan.interface';
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
import { ProductPlanProductComponent } from '../product-plan-products/product-plan-products';
import { environment } from '../../../../enviroment/enviroment';
import { codeValidator, integerValidatorWithNotify } from '../validators/form.validators';

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
    ProductPlanProductComponent,
    MatProgressSpinnerModule
  ],
})
export class ProductPlanComponent implements OnInit, OnDestroy {
  showModal = false;
  isLoading = true;
  errorMessage = '';
  objectItems: ProductPlanInterface[] = [];
  objectItemsProduct: ProductPlanProductsInterface[] = [];
  selectedItem: ProductPlanInterface | null = null;
  itemForm: FormGroup | null = null;

  isExpanded: { [key: number]: boolean } = {};
  selectedItemIndex: number | null = null;
  private nextAvailableTempId: number = 0;
  private maxServerIdOnLoad: number = 0;
  private maxServerIdOnLoadProduct: number = 0;




  productMenu = [
    { label: 'Hlavný Zoznam', styleClass: 'btn-new navigation', click: () => this.closeModal() },
    // { label: 'Zoznam položiek', styleClass: 'btn-popular navigation', click: () => this.openModal() },
  ];

  columns: TableColumn[] = [
    { key: 'id', label: 'Kód', type: 'number' },
    { key: 'plan_number', label: 'Číslo plánu', type: 'text' },
    // { key: 'plan_type', label: 'Typ plánu', type: 'text' },
    { key: 'start_date', label: 'Platný od', type: 'text' },
    { key: 'end_date', label: 'Platný do', type: 'text' },
  ];

  constructor(
    private productPlanService: ProductPlanService,
    private userService: UserService,
    private notify: NotificationService,
    private fb: FormBuilder
  ) { }

  ngOnInit(): void {
    this.loadAllItems();
    this.loadAllItemsProduct()
  }




  /** 🔹 Otvorí modal s plánom */
  openModal() { this.showModal = true; console.log('Modal showModal =', this.showModal); }

  closeModal() {
    this.showModal = false;
  }

  //----------------------------------------------------------------------------
  // #region  loadAllItemsProduct() funkcia
  //ANCHOR - loadAllItemsProduct() funkcia

  private loadAllItemsProduct() {
    if (!this.userService.isLoggedIn()) {
      this.errorMessage = 'Nie ste prihlásený';
      this.isLoading = false;
      return;
    }

    this.isLoading = true;

    this.productPlanService.loadItemPlans().subscribe({
      next: (items) => {
        this.objectItemsProduct = items.map((c) => ({ ...c }));

        const ids = this.objectItemsProduct.map(item => item.id || 0);
        const maxId = Math.max(...ids)


        // 🚨 KĽÚČOVÉ NASTAVENIE: Max ID zo servera
        this.maxServerIdOnLoadProduct = maxId;

        // Nastavíme temp ID na o 1 vyššie než max server ID
        this.nextAvailableTempId = maxId + 1;

        this.isLoading = false;
      },
      error: (err) => {
        this.notify.showError(err.error?.message || 'Nepodarilo sa načítať dáta Z this.productPlanService.loadItemPlans ');
        this.isLoading = false;
      }
    });
  }

  //#endregion
  //----------------------------------------------------------------------------
  // #region  private loadAllItems() funkcia / 
  //ANCHOR - loadAllItems() funkcia
  // /** 🔹 Načítanie všetkých plánov */
  private loadAllItems() {
    if (!this.userService.isLoggedIn()) {
      //STUB - 'Nie ste prihlásený
      if (!environment.production && environment.debug) { console.log('Nie ste prihlásený'); }
      this.notify.showError('Nie ste prihlásený');
      this.isLoading = false;
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.productPlanService.loadAllProductPlans().subscribe({
      next: (items) => {
        this.objectItems = items.map((c) => ({ ...c }));
        //STUB - 1. Data z loadAllItems:", this.objectItems
        if (!environment.production && environment.debug) {
          console.log("1. Data z loadAllItems:", this.objectItems);


          const allIds = this.objectItems.map(item => item.id).filter(id => id !== undefined) as number[];

          //STUB -  all ids spread", ...allIds ,,,"all ids", allIds
          if (!environment.production && environment.debug) {
            console.log("all ids spread", ...allIds);
            console.log("all ids", allIds);
          }
          this.maxServerIdOnLoad = allIds.length > 0 ? Math.max(...allIds) : 0;
          //STUB  "maxIdNumber", this.maxServerIdOnLoad
          if (!environment.production && environment.debug) {
            console.log("maxIdNumber", this.maxServerIdOnLoad);
          }
        }

        if (this.objectItems.length) {
          // Ak nebola vybraná žiadna položka (prvé načítanie)
          this.selectedItem = this.objectItems[0];
          this.initForm(this.selectedItem);

        } else {
          //STUB  'Niesu vybraté žiadne plány
          if (!environment.production && environment.debug) { console.log('Niesu vybraté žiadne plány'); }

          this.notify.showError('Niesu vybraté žiadne plány');
        }

        this.isLoading = false;
      },
      error: (err) => {

        //STUB  console.error('Chyba z API:', err); 
        if (!environment.production && environment.debug) { console.error('Chyba z API:', err); }
        this.notify.showError(err.error?.message || 'Nepodarilo sa načítať dáta');
        this.isLoading = false;

      },
    });


  }
  // #endregion
  //----------------------------------------------------------------------------
  // #region  initForm funkcia / 
  //ANCHOR - initForm funkcia
  initForm(item?: ProductPlanInterface) {

    const isNewPlan = item?.id === undefined || item?.id === null;

    this.itemForm = this.fb.group({
      id: [item?.id ?? null],
      plan_number: [{ value: item?.plan_number ?? '', disabled: !isNewPlan }],
      plan_type: [{ value: item?.plan_type ?? '', disabled: !isNewPlan }],
      start_date: [item?.start_date ?? '', Validators.required],
      end_date: [item?.end_date ?? '', Validators.required],
      items: this.fb.array(
        item?.items?.map((i) =>
          this.fb.group({
            id: [i.id ?? null],
            product: [{ value: i.product ?? '', disabled: false }],
            // Ak API vracia i.product_id (kód), použite ho. Ak nie, bude prázdne.
            product_id: [
              i.product_id ?? '',

              [
                Validators.required,
                codeValidator(this.notify),

              ]
            ],

            // 🚨 KRITICKÁ ZMENA: Odstránené disabled: true, aby sa pole aktualizovalo cez patchValue
            product_name: [{ value: i.product_name ?? '', disabled: false }],

            planned_quantity: [
              i.planned_quantity ?? 0,
              [
                Validators.required,
                integerValidatorWithNotify(this.notify),
                Validators.min(1)
              ]
            ],

            planned_date: [i.planned_date ?? '', Validators.required],
            status: [i.status ?? 'pending', Validators.required],
            transfered_pcs: [{ value: i.transfered_pcs ?? 0, disabled: true }],
            ingredients_status: this.fb.array(
              i.ingredients_status?.map((ing) =>
                this.fb.group({
                  ingredient: [ing.ingredient],
                  required_qty: [ing.required_qty],
                  available_qty: [ing.available_qty],
                  is_sufficient: [ing.is_sufficient],
                })
              ) || []
            ),
          })
        ) || []
      ),
    });


    if (this.itemsFormArray.length > 0) {
      this.itemsFormArray.controls.forEach((itemGroup: FormGroup, index: number) => {
        this.setupLiveSearchForItem(itemGroup, index);
      });

      //STUB - ✅ Live Search obsluha zmien spustená pre ${this.itemsFormArray.length} riadkov.
      if (!environment.production && environment.debug) { console.log(`✅ Live Search obsluha zmien spustená pre(pocet vyrobkov v sisteme) ${this.itemsFormArray.length} riadkov.`); }
    }
  }

  // #endregion 

  //----------------------------------------------------------------------------
  //ANCHOR - get itemsFormArray() vlasnost
  /** 🔹 Getter pre položky plánu */
  get itemsFormArray(): FormArray<FormGroup> {
    return (this.itemForm?.get('items') as FormArray<FormGroup>) || new FormArray<FormGroup>([]);
  }
  //ANCHOR - getIngredientsFormArray vlasnost
  getIngredientsFormArray(itemGroup: FormGroup): FormArray<FormGroup> {
    const control = itemGroup.get('ingredients_status');
    return control instanceof FormArray ? control : new FormArray<FormGroup>([]);
  }

  //ANCHOR - toggleIngredients funkcia
  toggleIngredients(index: number) {
    this.isExpanded[index] = !this.isExpanded[index];
  }

  //----------------------------------------------------------------------------
  // #region  saveItem funkcia / 
  //ANCHOR - saveItem funkcia
  saveItem(item?: any) {
    // 💡 KĽÚČOVÁ ZMENA: Pridaná kontrola 'this.isCreatingNewPlan'
    if (this.suppressLiveSave || this.isCreatingNewPlan) {
      console.log(`-- saveItem preskočené. suppressLiveSave: ${this.suppressLiveSave}, isCreatingNewPlan: ${this.isCreatingNewPlan}`, item);
      return;
    }
    console.trace('🔥 saveItem() SPUSTENÉ');

    // Kontrola platnosti celého formulára
    if (!this.itemForm?.valid) {
      this.notify.notify('Formulár nie je platný. Prosím, opravte chyby.', 'warn');
      return;
    }

    const formValue = this.itemForm.getRawValue();
    const planId = formValue.id;

    // Ak chýba ID, ide o NOVÝ PLÁN (POST)
    if (planId === null || planId === undefined) {
      this.saveNewPlan(formValue);
      return;
    }
    // 1. Príprava payloadu pre HLAVNÝ PLÁN (PATCH)
    const planPayload: Partial<ProductPlanInterface> = {};
    const planStartDateControl = this.itemForm.get('start_date');
    const planEndDateControl = this.itemForm.get('end_date');

    // Kontrola, či sa zmenili dátumy plánu
    if (planStartDateControl?.dirty) {
      planPayload.start_date = new Date(formValue.start_date).toISOString().slice(0, 10);
    }
    if (planEndDateControl?.dirty) {
      planPayload.end_date = new Date(formValue.end_date).toISOString().slice(0, 10);
    }

    // 2. Definícia volania pre HLAVNÝ PLÁN (bude spustená v subscribe)
    const planRequest$: Observable<ProductPlanInterface | null> =
      Object.keys(planPayload).length > 0
        ? this.productPlanService.updatePlan(formValue.id, planPayload)
        : of(null); // Ak nie sú zmeny, vraciame prázdny Observable



    // 3. Rozdelenie položiek na NOVÉ a ZMENENÉ
    // 🚨 Správna deštrukturalizácia po implementácii fixu
    const { newItemsToProcess, changedItems, hasInvalidNewItems } = this.separateItems();

    // 4. Reťazenie požiadaviek (Plán -> Položky)
    planRequest$.subscribe({
      next: () => {
        // A. Sú prioritne NOVÉ položky?
        if (newItemsToProcess.length > 0) {
          // Spusti POST volania pre nové + následné PATCH pre zmenené
          this.saveNewItems(newItemsToProcess, changedItems);

          // B. Sú len ZMENENÉ položky?
        } else if (changedItems.length > 0) {
          // Spusti len PATCH volania
          this.updateChangedItems(changedItems);

          // C. Uložil sa len plán (dátumy) a položky sú bezo zmeny?
        } else if (Object.keys(planPayload).length > 0) {
          this.notify.notify('Plán bol úspešne uložený, položky bezo zmeny.');
          this.itemForm?.markAsPristine();
          this.loadAllItems();

          // D. Boli zistené neplatné položky? (FIX MÄTÚCEJ SPRÁVY)
        } else if (hasInvalidNewItems) {
          // V tomto bode už bola zobrazená notifikácia v separateItems()
          console.log('🛑 Ukladanie zrušené: Boli nájdené neplatné nové položky. Nebude zobrazená všeobecná chyba.');

          // E. Skutočne žiadne zmeny
        } else {
          this.notify.notify('Neboli zistené žiadne zmeny na uloženie.', 'info');
        }
      },
      error: (err) => {
        console.error('❌ Error pri ukladaní plánu:', err);
        this.notify.notify('Chyba pri ukladaní plánu');
      },
    });
  }
  itemFormItems: ProductPlanInterface['items'] = [];
  saveAllItems() {
    this.itemFormItems.forEach((item: ProductPlanInterface['items'][number]) => this.saveItem(item));
  }
  //#endregion

  //----------------------------------------------------------------------------
  // #region  loadAllItemsProduct() funkcia
  //ANCHOR - createNewPlan() funkcia
  isCreatingNewPlan = false;
  suppressLiveSave = false;
  isFormDirty(): boolean {
    return this.itemForm?.dirty || false;
  }

  async createNewPlan() {
    // 🔹 Ak je formulár dirty, spýtať sa užívateľa
    if (this.isFormDirty()) {
      const confirmSave = await this.notify.confirm(
        'Máte neuložené zmeny. Chcete ich uložiť pred vytvorením nového plánu?'
      );

      if (confirmSave) {
        this.saveItem();
      } else {
        this.notify.notify('Zmeny ignorované, pokračujeme s novým plánom.')

        //STUB  'Zmeny ignorované, pokračujeme s novým plánom.'
        if (!environment.production && environment.debug) { console.log('Zmeny ignorované, pokračujeme s novým plánom.'); }

      }
    }

    this.isCreatingNewPlan = true;
    this.suppressLiveSave = true;
    // 💡 VÝPOČET DEFAULTNÝCH DÁTUMOV
    const today = new Date();

    // Začiatok mesiaca (1. deň, 00:00:00)
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    // Koniec mesiaca (posledný deň, 23:59:59.999)
    // Nastavíme na 0. deň nasledujúceho mesiaca
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    // Formátovanie na YYYY-MM-DD
    const formatDate = (date: Date): string => date.toISOString().slice(0, 10);
    // 🔹 Default hodnoty nového plánu
    const newPlanDefaults: ProductPlanInterface = {
      is_serialized: false,
      plan_number: 'NOVÝ PLÁN',
      plan_type: 'monthly',
      start_date: formatDate(firstDayOfMonth), // Prvý deň aktuálneho mesiaca
      end_date: formatDate(lastDayOfMonth),
      items: [],
      created_at: null,
      updated_at: null
    };

    // 🔹 Inicializujeme formulár. 
    // AK má initForm v sebe valueChanges, TOTO spustí event.
    this.initForm(newPlanDefaults);
    this.selectedItem = newPlanDefaults;



    // 🔹 Označíme formulár ako čistý, čo je kľúčové
    this.itemForm?.markAsPristine();

    // 💡 KĽÚČOVÁ ZMENA 2: Odblokujeme live save až po krátkom oneskorení
    // Tým sa zabezpečí, že Angular spracuje všetky inicializačné zmeny (patchValue atď.)
    // bez toho, aby spustil valueChanges.
    setTimeout(() => {
      this.suppressLiveSave = false;
      this.isCreatingNewPlan = false;
      //STUB  ✅ Live Save a isCreatingNewPlan sú znova aktívne.
      if (!environment.production && environment.debug) { console.log('✅ Live Save a isCreatingNewPlan sú znova aktívne.'); }


    }, 0);

    //STUB  🔥 createNewPlan() SPUSTENÉ', 
    if (!environment.production && environment.debug) { console.log('🔥 createNewPlan() SPUSTENÉ', newPlanDefaults); }

  }

  //#endregion

  //----------------------------------------------------------------------------
  // #region  separateItems funkcia
  //ANCHOR - separateItems funkcia
  private separateItems(): {
    //REVIEW - newItemsToProcess-Post
    newItemsToProcess: Partial<ProductPlanProductsInterface>[],
    //REVIEW - changedItems-patch
    changedItems: Partial<ProductPlanInterface>[],
    //REVIEW - hasInvalidNewItems
    hasInvalidNewItems: boolean
  } {
    const newItemsToProcess: Partial<ProductPlanProductsInterface>[] = [];
    const changedItems: Partial<ProductPlanInterface>[] = [];
    let hasInvalidNewItems = false;

    //STUB  🎆 separateItems called'
    if (!environment.production && environment.debug) { console.trace('🎆 separateItems called') }



    // ⛔ BLOKÁCIA POČAS CREATE NEW PLAN
    if (this.isCreatingNewPlan) {
      //STUB  ⛔ separateItems() preskočené — prebieha createNewPlan()"
      if (!environment.production && environment.debug) { console.warn("⛔ separateItems() preskočené — prebieha createNewPlan()"); }
      return {
        newItemsToProcess: [],
        changedItems: [],
        hasInvalidNewItems: false
      };
    }

    // Zoznam kľúčov, ktoré sa smú meniť a odosielať na PATCH
    const updateableKeys = ['planned_quantity', 'planned_date', 'status', 'product'];

    this.itemsFormArray.controls.forEach((itemGroup: FormGroup) => {
      const itemId = itemGroup.get('id')?.value;
      const isNewItem = itemId > this.maxServerIdOnLoadProduct;

      // 🔍 KONTROLNÝ LOG
      console.log(`-- Položka ID: ${itemId}. Max Server ID pri Load: ${this.maxServerIdOnLoadProduct}. Is New: ${isNewItem}. Dirty: ${itemGroup.dirty}`);

      // ------------------------------------
      // A. NOVÁ POLOŽKA (POST)
      // ------------------------------------
      if (isNewItem) {
        if (!itemGroup.valid) {
          this.notify.notify(`Nová položka s dočasným ID ${itemId} nie je platná! Vyplňte Produkt a Množstvo.`, 'error');
          hasInvalidNewItems = true;
          return;
        }

        const fullPayload = itemGroup.getRawValue();

        // 💡 Čistenie payloadu pre POST
        delete fullPayload.id;
        delete fullPayload.product_id;
        delete fullPayload.product_name;
        delete fullPayload.production_card;
        delete fullPayload.transfered_pcs;

        // 💡 Formátovanie dátumu
        if (fullPayload.planned_date) {
          fullPayload.planned_date = new Date(fullPayload.planned_date).toISOString().slice(0, 10);
        }

        newItemsToProcess.push(fullPayload as Partial<ProductPlanProductsInterface>);

        console.log("new items to process", newItemsToProcess,);
      }

      // ------------------------------------
      // B. EXISTUJÚCA POLOŽKA (PATCH/UPDATE)
      // ------------------------------------
      else if (itemGroup.dirty) {
        console.log(`-- Položka ID: ${itemId} smeruje do PATCH bloku.`);

        const itemPayload: Partial<ProductPlanInterface> = { id: itemId };
        let isItemDirty = false;

        // Iterujeme len cez kľúče, ktoré vieme aktualizovať
        updateableKeys.forEach(key => {
          const control = itemGroup.get(key);

          if (control && control.dirty) {
            let value = control.value;

            if (key === 'planned_date' && value) {
              value = new Date(value).toISOString().slice(0, 10);
            }

            (itemPayload as any)[key] = value;
            isItemDirty = true;
          }
        });

        if (isItemDirty) {
          changedItems.push(itemPayload);
        }
      }
    });

    return { newItemsToProcess, changedItems, hasInvalidNewItems };
  }
  //#endregion


  //----------------------------------------------------------------------------
  // #region  saveNewItems() funkcia
  //ANCHOR - saveNewItems() funkcia
  private saveNewItems(
    newItems: Partial<ProductPlanProductsInterface>[],
    changedItems: Partial<ProductPlanProductsInterface>[]
  ): void {
    if (newItems.length === 0) {
      // Ak nie sú nové položky, rovno aktualizujeme zmenené
      this.updateChangedItems(changedItems);
      return;
    }

    console.log('🚀 POST PAYLOAD (Nové položky):', newItems);

    // Vytvoríme pole POST požiadaviek pre všetky nové položky
    const postRequests = newItems.map(item => this.productPlanService.createItemPlan(item));

    // Spustíme všetky POST naraz
    forkJoin(postRequests).subscribe({
      next: (createdItems: ProductPlanProductsInterface[]) => {
        console.log('✅ Nové položky úspešne vytvorené na serveri:', createdItems);

        // Každá nová položka dostane ID zo servera
        createdItems.forEach((item, idx) => {
          const formItem = this.itemsFormArray.at(idx);
          if (formItem) {
            formItem.patchValue({ id: item.id }); // aktualizujeme ID
            formItem.markAsPristine();           // označíme ako čisté
          }
        });

        this.notify.notify(`${createdItems.length} nových položiek bolo úspešne uložených`, 'success');

        // Po úspechu POST spustíme aktualizáciu existujúcich položiek (PATCH)
        if (changedItems.length > 0) {
          this.updateChangedItems(changedItems);
        } else {
          // Ak nie sú žiadne zmeny, refresh dát
          this.loadAllItems();
        }
      },
      error: (err) => {
        console.error('❌ Chyba pri ukladaní nových položiek:', err);
        let errorMessage = 'Nastala neznáma chyba pri ukladaní položiek.';

        if (err.error) {
          const errorBody = err.error;
          if (errorBody.non_field_errors) {
            errorMessage = errorBody.non_field_errors.join('; ');
          } else if (errorBody.detail) {
            errorMessage = errorBody.detail;
          } else if (Object.keys(errorBody).length > 0) {
            const fieldName = Object.keys(errorBody)[0];
            const fieldErrors = errorBody[fieldName];
            errorMessage = `Chyba v poli '${fieldName}': ${fieldErrors[0]}`;
          }
        } else {
          errorMessage = `Chyba POST (${err.status}): ${err.statusText || 'Neznámy problém siete.'}`;
        }

        this.notify.showError(errorMessage);
      }
    });
  }
  //#endregion

  private updateChangedItems(changedItems: Partial<ProductPlanProductsInterface>[]): void {

    // 0. Predbežná kontrola: Ak nie sú žiadne zmeny, skončíme
    if (changedItems.length === 0) {
      console.warn('Neboli nájdené žiadne zmenené položky na odoslanie.');
      this.itemForm?.markAsPristine();
      return;
    }

    console.log('PATCHING ITEMS (na odoslanie):', changedItems);

    // Vytvoríme pole Observable pre všetky PATCH požiadavky
    const patchRequests = changedItems.map(item => {

      // 🚨 KONTROLA ID: Uistíme sa, že položka na aktualizáciu má ID
      if (!item.id) {
        // Táto položka by nemala byť v changedItems, ak ide o PATCH.
        // Ak k tomu dôjde, je to chyba logiky v predchádzajúcej metóde.
        console.error("❌ CHYBA LOGIKY: Položka určená na PATCH nemá definované 'id'!", item);
        throw new Error("Aktualizačná položka musí mať ID.");
      }

      // Volanie PATCH zo služby
      return this.productPlanService.updateItemPlan(item.id, item);
    });

    // forkJoin zabezpečí, že sa všetky aktualizácie spustia paralelne a čaká na dokončenie všetkých
    forkJoin(patchRequests).subscribe({
      next: () => {
        // ✅ ÚSPECH: Ak všetky požiadavky prejdú
        this.notify.showSuccess(`Úspešne aktualizovaných ${changedItems.length} existujúcich položiek.`);
        this.itemForm?.markAsPristine(); // Označenie formulára ako čistého
        this.loadAllItems(); // Pre-načítanie dát zo servera
      },
      error: (err) => {
        // ❌ CHYBA: Ak zlyhá akákoľvek požiadavka v rámci forkJoin

        let errorMessage = 'Nastala neznáma chyba pri aktualizácii položiek.';

        if (err.error) {
          const errorBody = err.error;

          // 1. CHYBA NEPOĽA (Uzamknutá položka, Logika z Serializeru)
          if (errorBody.non_field_errors && errorBody.non_field_errors.length > 0) {
            errorMessage = errorBody.non_field_errors.join('; ');
          }
          // 2. Všeobecná chyba (Detail - Oprávnenia, Not Found, atď.)
          else if (errorBody.detail) {
            errorMessage = errorBody.detail;
          }
          // 3. Chyba KONKRÉTNEHO POĽA (Validácia dát)
          else if (Object.keys(errorBody).length > 0) {
            // Zoberieme prvú chybu z prvého poľa
            const fieldName = Object.keys(errorBody)[0];
            const fieldErrors = errorBody[fieldName];

            if (Array.isArray(fieldErrors) && fieldErrors.length > 0) {
              // Formátujeme správu pre používateľa
              errorMessage = `Chyba v poli '${fieldName}': ${fieldErrors[0]}`;
            }
          }

          console.error('❌ DETAILED DRF PATCH ERROR:', errorBody);

        } else {
          // Chyby siete (500, timeout, atď. bez detailného JSON tela)
          errorMessage = `Chyba PATCH (${err.status}): ${err.statusText || 'Neznámy problém siete.'}`;
          console.error('❌ PATCH Chyba pri ukladaní:', err);
        }

        // 📢 KĽÚČOVÉ: Zobrazíme extrahovanú chybovú správu
        this.notify.showError(errorMessage);
      }
    });
  }

  /** 🔹 Zrušenie zmien */
  cancelEdit() {
    if (!this.selectedItem) return;
    this.initForm(this.selectedItem);
    this.itemForm?.markAsPristine();
    this.notify.notify('Zmeny boli zrušené', 'info');
  }

  /** 🔹 Výber iného plánu s potvrdením */
  async selectItems(item: ProductPlanInterface) {
    console.log("⚠️ selectItems() SPUSTENÉ", { item });
    if (this.itemForm?.dirty) {
      const ok = await this.notify.confirm('Máte neuložené zmeny. Chcete ich uložiť?');
      if (ok) {
        this.saveItem();
      } else {
        this.notify.notify('Neuložené zmeny boli zahodené', 'warn');
      }
    }

    const selected = this.objectItems.find((i) => i.id === item.id) || item;
    this.initForm(selected);
    setTimeout(() => (this.selectedItem = selected));
  }

  /** 🔹 Zmazanie položky (produktu) z plánu */
  async deleteItem(): Promise<void> {
    // Kontrola, či je nejaká položka vybraná
    if (this.selectedItemIndex === null) {
      this.notify.notify('Pre zmazanie, najprv vyberte položku (riadok) kliknutím.', 'warn');
      return;
    }

    const index = this.selectedItemIndex;
    const itemGroup = this.itemsFormArray.at(index) as FormGroup;
    const itemId = itemGroup.get('id')?.value;
    const itemName = itemGroup.get('product_name')?.value || 'Položka';

    if (!itemId) {
      this.notify.notify(`Položku ${itemName} nie je možné zmazať (chýba ID).`);
      console.error(`🛑 Chyba: Položka na indexe ${index} nemá ID na zmazanie.`);
      return;
    }

    console.log(`🔍 Pripravujem zmazanie položky: ID: ${itemId}, Názov: ${itemName}, Index: ${index}`);

    const confirm = await this.notify.confirm(
      `Naozaj chcete zmazať vybranú položku: ${itemName}? (ID: ${itemId})`
    );

    if (confirm) {
      console.log(`✅ Potvrdené zmazanie položky ID: ${itemId}`);
      this.productPlanService.deleteProductForPlans(itemId).subscribe({
        next: () => {
          console.log(`🗑️ Úspešne zmazaná položka ID: ${itemId} zo servera.`);

          this.itemsFormArray.removeAt(index);
          delete this.isExpanded[index];
          this.selectedItemIndex = null; // Reset výberu

          this.notify.notify(`Položka ${itemName} bola úspešne zmazaná.`);
          this.loadAllItems();
        },
        error: (err) => {
          console.error(`❌ Chyba pri mazaní položky ID: ${itemId}`, err);
          this.notify.notify(`Chyba pri mazaní položky ${itemName}.`);
        },
      });
    } else {
      console.log(`🚫 Zmazanie položky ID: ${itemId} bolo zrušené používateľom.`);
    }
  }
  /** 🔹 Uloží index aktuálne vybranej položky pre jej zmazanie */
  selectItemForDelete(index: number) {
    this.selectedItemIndex = index;
    console.log(`Vybraná položka na zmazanie: Index ${index}, ID: ${this.itemsFormArray.at(index).get('id')?.value}`);
  }


  // V ProductPlanComponent.ts
  private createItemFormGroup(item?: Partial<ProductPlanItemForm>): FormGroup {
    let itemId = item?.id || null;

    if (itemId === null) {
      // 💡 KĽÚČOVÁ OPRAVA: Použijeme aktuálne ID, AŽ POTOM ho navýšime.
      itemId = this.nextAvailableTempId;
      this.nextAvailableTempId++;
    }


    // 🚨 Log potvrdzuje, že ID je správne nastavené
    console.log(`🆕 Vytváram nový FormGroup: Dočasné ID: ${itemId}, Next Temp ID pre ďalšiu: ${this.nextAvailableTempId}`);

    // 🚀 Definícia FormGroup (s predpokladanými kontrolkami)
    return this.fb.group<{ [key in keyof ProductPlanItemForm]: any }>({
      id: [itemId],
      production_plan: [item?.production_plan || this.selectedItem?.id, Validators.required],
      product: [item?.product || null, Validators.required],
      product_name: [item?.product_name || null],
      planned_quantity: [item?.planned_quantity || 1, [Validators.required, Validators.min(1)]],
      planned_date: [item?.planned_date || new Date().toISOString().slice(0, 10), Validators.required],
      status: [item?.status || 'pending', Validators.required],
      production_card: [item?.production_card || null],
      transfered_pcs: [item?.transfered_pcs || 0],
      // ... (predpokladané UI pole, ak ho používate pre vyhľadávanie)
      product_id: [item?.product_name ? item.product_id : ''],
    }) as FormGroup;
  }



  addNewItem(runLiveSearch = true) {
    if (!this.selectedItem || !this.itemForm) {
      this.notify.notify('Vyberte najprv plán, do ktorého chcete položku pridať.', 'warn');
      return;
    }

    // 🔹 Zakážeme live save ešte pred vytvorením riadku
    this.suppressLiveSave = true;

    // 1. Vytvor nový, prázdny FormGroup
    const newItemGroup = this.createItemFormGroup();

    // 2. Pridaj ho na koniec FormArray
    this.itemsFormArray.push(newItemGroup);

    // 3. Nastav index na poslednú položku
    const newIndex = this.itemsFormArray.length - 1;
    this.selectedItemIndex = newIndex;

    // 4. Spustíme live search pre nový riadok iba ak runLiveSearch = true
    if (runLiveSearch) {
      this.setupLiveSearchForItem(newItemGroup, newIndex);
    }

    this.notify.notify(`Bol pridaný nový riadok s dočasným ID: ${newItemGroup.get('id')?.value}.`, 'info');

    // 🔹 Odblokujeme live save až po dokončení pridania
    this.suppressLiveSave = false;

    // Voliteľné: scroll na spodok
    setTimeout(() => {
      document.querySelector('.product-item:last-child')?.scrollIntoView({ behavior: 'smooth' });
    }, 0);
  }


  ngOnDestroy(): void {
    this.liveSearchSub?.unsubscribe();
  }

  //----------------------------------------------------------------------------
  // #region setupLiveSearchForItem() funkcia / 
  //ANCHOR - setupLiveSearchForItem funkcia
  private liveSearchSub?: Subscription;
  private setupLiveSearchForItem(itemGroup: FormGroup, index: number): void {
    // Používame pole 'product_id' pre UI vyhľadávanie
    const searchControl = itemGroup.get('product_id');

    // 💡 Nastavíme debounce pre zníženie frekvencie API volaní
    this.liveSearchSub = searchControl?.valueChanges.pipe(
      debounceTime(300), // Počká 300ms po poslednom stlačení klávesu
      distinctUntilChanged(), // Spustí sa len, ak sa hodnota naozaj zmenila

      // Zabezpečí, že neodosielame prázdny reťazec
      filter((query: string) => query?.length > 3),

      // Volanie servisnej metódy s query
      switchMap((query: string) => {
        //STUB  Spúšťam API Live Search pre query
        if (!environment.production && environment.debug) { console.log(`🔎 Spúšťam API Live Search pre query: ${query}`); }

        return this.productPlanService.loadAllProductForPlansSearch(query);
      }),
    ).subscribe((results: ProductPlanItemsInterface[]) => {

      //STUB  ➡️ API vrátilo výsledky (results):', results);
      if (!environment.production && environment.debug) { console.log('➡️ API vrátilo výsledky (results):', results); }

      const enteredCode = itemGroup.get('product_id')?.value;

      //STUB  Vstupný kód:', enteredCode;
      if (!environment.production && environment.debug) { console.log('Vstupný kód:', enteredCode); }
      //STUB  'ItemGroup:', itemGroup);
      if (!environment.production && environment.debug) { console.log('ItemGroup:', itemGroup); }

      // Hľadáme produkt, ktorého product_id sa PRESNE zhoduje so zadaným kódom
      const foundProduct = results.find(
        p => p.product_id.toUpperCase() === enteredCode.toUpperCase()
      );


      if (foundProduct) {
        this.selectProductAndClose(index, foundProduct);

        //STUB  `Produkt ${foundProduct.product_id} bol presne nájdený a vybraný.`, 'success'
        if (!environment.production && environment.debug) { console.log(`Produkt ${foundProduct.product_id} bol presne nájdený a vybraný.`, 'success'); }
        this.notify.notify(`Produkt ${foundProduct.product_id} bol presne nájdený a vybraný.`, 'success');

      } else if (results.length > 0) {
        // Našli sa čiastočné zhody (napr. E00), ale nie presný kód (E003)
        this.notify.notify('Kód nájdený, ale nevyhovuje presnej zhode. Zadajte celý kód.', 'warn');

      } else {
        // Nenájdené
        this.notify.notify('Produkt nebol nájdený.', 'warn');
      }


    });

  }
  //#endregion
  //----------------------------------------------------------------------------
  // #region sselectProductAndClosefunkcia / 
  //ANCHOR - selectProductAndClose funkcia
  selectProductAndClose(index: number, product: ProductPlanItemsInterface): void {
    const itemGroup = this.itemsFormArray.at(index) as FormGroup;

    // ❌ Zakážeme live save úplne
    this.suppressLiveSave = true;

    itemGroup.patchValue({
      // 🟢 ID produktu z výsledkov ide do cieľového poľa 'product'
      product: product.id,
      // Kód produktu pre UI (zobrazenie v inpute a nadpise)
      product_id: product.product_id,
      // Ostatné detaily
      product_name: product.product_name,
      planned_quantity: 1,

    }, { emitEvent: false });

    // Potrebujete označiť dotknuté polia ako dirty, aby sa odoslali pri manuálnom SAVE,
    // ale NESMÚ sa odoslať v tomto momente!
    itemGroup.get('product')?.markAsDirty();
    itemGroup.get('product_id')?.markAsDirty();
    itemGroup.get('product_name')?.markAsDirty();
    itemGroup.get('planned_quantity')?.markAsDirty();
    // itemGroup.markAsDirty();
    this.notify.notify(`Produkt ${product.product_id} bol nastavený.`, 'success');
    setTimeout(() => { this.suppressLiveSave = false; }, 0);

  }

  //#endregion


  //----------------------------------------------------------------------------
  // #region  onProductSelectedfunkcia / 
  //ANCHOR -  onProductSelected funkcia
  //REVIEW - editingProductIndex
  // 🔥 Vždy bezpečne vráti FormArray (alebo vyhodí jasnú chybu pri vývoji)
  get itemsArray(): FormArray {
    const control = this.itemForm?.get('items');

    // Ak FormArray neexistuje alebo nie je správneho typu
    if (!control || !(control instanceof FormArray)) {

      // 1️⃣ Vývojový režim: throw, aby sme chybu hneď videli
      if (!environment.production) {
        throw new Error("FormControl 'items' neexistuje alebo nie je FormArray.");
      }

      // 2️⃣ Produkcia: len upozornenie používateľovi
      this.notify.notify("Niečo je zle s formulárom – kontaktujte podporu.", "error");

      // Vrátime prázdny FormArray, aby aplikácia neskončila crashom
      return new FormArray<any>([]);
    }

    return control;
  }


  // 🔥 Bezpečne vráti FormGroup pre daný riadok alebo null
  getItemRow(index: number): FormGroup | null {
    const row = this.itemsArray.at(index);
    return row instanceof FormGroup ? row : null;
  }

  // 🔥 Tvoj nový úplne bezpečný event handler
  editingProductIndex: number | null = null;

  onProductSelected(product: ProductFromModal) {
    console.log("onProductSelected spustené");

    if (this.editingProductIndex === null) {
      this.notify.notify("Žiadny riadok nie je vybraný na úpravu.", 'error');
      return;
    }

    const row = this.getItemRow(this.editingProductIndex);

    if (!row) {
      this.notify.notify("Riadok na aktualizáciu sa nenašiel.", 'error');
      return;
    }

    const productPayload = {
      product: product.id,
      product_id: product.product_id,
      product_name: product.product_name,
    };

    // 🔥 Toto je teraz 100% bezpečné
    row.patchValue(productPayload);
    row.markAsDirty();

    this.notify.notify(
      `Produkt ${product.product_name} bol ZMENENÝ v riadku ${this.editingProductIndex + 1}.`,
      'success'
    );

    this.editingProductIndex = null;
    this.closeModal();
  }
  //#endregion


  openModalForEdit(index: number) {
    // 1. Uložíme index editovaného riadku. TOTO je to, čo chýbalo.
    this.editingProductIndex = index;

    // 2. Otvoríme modal.
    this.showModal = true;

    console.log(`Modal otvorený pre index: ${index}.`);
  }


  private saveNewPlan(formValue: any): void {


    // 1. Získanie a čistenie položiek
    const { newItemsToProcess, hasInvalidNewItems } = this.separateItemsForNewPlan();

    if (hasInvalidNewItems) {
      this.notify.notify('Uloženie bolo zrušené: Všetky položky musia byť platné.', 'error');
      return;
    }

    // 2. Pripravíme Payload pre HLAVNÝ PLÁN (POST)
    const planPostPayload: Partial<ProductPlanInterface> = {
      // Iba dáta, ktoré server očakáva (start/end date)
      start_date: new Date(formValue.start_date).toISOString().slice(0, 10),
      end_date: new Date(formValue.end_date).toISOString().slice(0, 10),

      // 🚨 KĽÚČOVÉ: Pridáme spracované položky
      items: newItemsToProcess as any,

      // Ak API očakáva aj tieto polia:
      // plan_type: formValue.plan_type, 
      // plan_number: formValue.plan_number,
    };

    // 3. Spustíme POST volanie
    this.productPlanService.createPlan(planPostPayload).subscribe({
      next: (newPlan: ProductPlanInterface) => {
        this.notify.notify('✅ Nový plán a jeho položky boli úspešne vytvorené!', 'success');
        this.itemForm?.markAsPristine();

        this.loadAllItems();
      },
      error: (err) => {
        console.error('❌ Chyba pri vytváraní nového plánu:', err);
        this.notify.notify('Chyba pri vytváraní nového plánu. Skontrolujte konzolu.', 'error');
      }
    });
  }


  private separateItemsForNewPlan(): {
    newItemsToProcess: Partial<any>[], // Používame any, pretože tu vyhadzujeme kľúče
    hasInvalidNewItems: boolean
  } {
    const newItemsToProcess: Partial<any>[] = [];
    let hasInvalidNewItems = false;

    this.itemsFormArray.controls.forEach((itemGroup: FormGroup) => {
      if (!itemGroup.valid) {
        hasInvalidNewItems = true;
        return;
      }

      const fullPayload = itemGroup.getRawValue();

      // 🚨 KĽÚČOVÉ: Vyhadzujeme všetky polia, ktoré nastaví server alebo sú len pre UI
      delete fullPayload.id;
      delete fullPayload.product_id;
      delete fullPayload.product_name;
      delete fullPayload.production_card;
      delete fullPayload.transfered_pcs;

      // Zabezpečíme správny formát dátumu:
      if (fullPayload.planned_date) {
        fullPayload.planned_date = new Date(fullPayload.planned_date).toISOString().slice(0, 10);
      }

      newItemsToProcess.push(fullPayload);
    });

    return { newItemsToProcess, hasInvalidNewItems };
  }

  getItemClass(itemGroup: any): string {
    // Získame hodnotu stavu priamo z formulárovej skupiny (FormControl)
    const status = itemGroup.get('status')?.value;

    switch (status) {
      case 'pending':
        return 'item-badge-pending';
      case 'in_production':
        return 'item-badge-processing'; // Použijeme existujúce farby
      case 'partially completed':
        return 'item-badge-partially';
      case 'completed':
        return 'item-badge-completed';
      case 'canceled':
        return 'item-badge-canceled';
      default:
        return '';
    }
  }


  getRowClass(row: any): string {
    const items = row.items;

    // 1. Ošetrenie prázdneho poľa
    if (!items || items.length === 0) {
      return 'badge-no-items'; // Nová trieda pre prázdny plán
    }

    // 2. Kontrola prítomnosti stavov
    // Používame some() na kontrolu, či je aspoň jeden takýto stav
    const hasCanceled = items.some((item: any) => item.status === 'canceled');
    const hasPending = items.some((item: any) => item.status === 'pending');
    const hasInProduction = items.some((item: any) => item.status === 'in_production');
    const hasPartiallyCompleted = items.some((item: any) => item.status === 'partially completed');

    // 3. Kontrola dokončenia (všetky musia byť completed)
    const allCompleted = items.every((item: any) => item.status === 'completed');

    // 4. Aplikácia logiky (podľa klesajúcej priority)

    // A. Ak je čokoľvek ZRUŠENÉ, celý plán má stav "Zrušený"
    if (hasCanceled) {
      return 'badge-canceled';
    }

    // B. Ak je čokoľvek VO VÝROBE (a nič nie je zrušené)
    if (hasInProduction) {
      return 'badge-processing'; // Používame pre in_production
    }

    // C. Ak čokoľvek ČAKÁ (a nič nie je zrušené/vo výrobe)
    if (hasPending) {
      return 'badge-pending';
    }

    // D. Ak je čokoľvek ČIASTOČNE PRENESENÉ
    if (hasPartiallyCompleted) {
      return 'badge-partially-completed';
    }

    // E. Ak sú VŠETKY položky Dokončené
    if (allCompleted) {
      return 'badge-completed';
    }

    // F. Ak sa sem dostaneme, je to neočakávaný/zmiešaný stav, napr. prázdny status
    return 'badge-mixed-status';
  }
}