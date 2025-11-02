import { Component, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Observable, debounceTime, distinctUntilChanged, filter, forkJoin, of, switchMap } from 'rxjs';

// Interfaces
import { ProductPlanInterface, ProductPlanItemForm, ProductPlanItemsInterface, ProductPlanProductsInterface } from '../../interface/productPlan.interface';
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
  ],
})
export class ProductPlanComponent implements OnInit {
  showModal = false;
  isLoading = true;
  errorMessage = '';
  objectItems: ProductPlanInterface[] = [];
  objectItemsProduct: ProductPlanProductsInterface[] = [];
  selectedItem: ProductPlanInterface | null = null;
  itemForm: FormGroup | null = null;

  isExpanded: { [key: number]: boolean } = {};
  selectedItemIndex: number | null = null;
  private nextAvailableTempId: number = 1;
  searchResultsMap: Map<number, ProductPlanItemsInterface[]> = new Map();


  productMenu = [
    { label: 'Hlavný Zoznam', styleClass: 'btn-new navigation', click: () => this.closeModal() },
    { label: 'Zoznam položiek', styleClass: 'btn-popular navigation', click: () => this.openModal() },
  ];

  columns: TableColumn[] = [
    { key: 'id', label: 'Kód', type: 'number' },
    { key: 'plan_number', label: 'Číslo plánu', type: 'text' },
    { key: 'plan_type', label: 'Typ plánu', type: 'text' },
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
  openModal(plan?: ProductPlanInterface) {
    if (plan) {
      this.selectedItem = plan;
      this.initForm(plan);
    }
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
  }

  // V ProductPlanComponent.ts

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

        // 🚀 KĽÚČOVÁ ÚPRAVA: Nájdeme najvyššie ID a nastavíme nextAvailableTempId
        let maxId = 0;
        this.objectItemsProduct.forEach(item => { // 👈 PREMENNÁ 'item' je teraz položka
          if (item.id && item.id > maxId) {
            maxId = item.id;
          }
        });
        this.nextAvailableTempId = maxId + 1;

        // ... (logika pre nastavenie selectedItem a initForm) ...
        if (this.selectedItem) {
          // ... (zabezpečenie refresha formulára)
        } else if (this.objectItems.length) {
          // ... (ak je prvýkrát, nastav prvý plán)
        }

        this.isLoading = false;
      },
      // ... (Error handling) ...
    });
  }

  /** 🔹 Načítanie všetkých plánov */
  private loadAllItems() {
    if (!this.userService.isLoggedIn()) {
      this.errorMessage = 'Nie ste prihlásený';
      this.isLoading = false;
      return;
    }

    this.isLoading = true;
    this.productPlanService.loadAllProductPlans().subscribe({
      next: (items) => {
        this.objectItems = items.map((c) => ({ ...c }));

        if (this.selectedItem) {
          const updatedSelectedItem = this.objectItems.find(i => i.id === this.selectedItem!.id);

          if (updatedSelectedItem) {
            this.selectedItem = updatedSelectedItem; // Aktualizujeme referenciu
            this.initForm(this.selectedItem);       // ZNOVA VYTVORÍME FORMULÁR s NOVÝMI DÁTAMI
          }
        } else if (this.objectItems.length) {
          // Ak nebola vybraná žiadna položka (prvé načítanie)
          this.selectedItem = this.objectItems[0];
          this.initForm(this.selectedItem);
        }

        this.isLoading = false;
      },
      error: (err) => {
        console.error(err);
        this.errorMessage = 'Nepodarilo sa načítať dáta';
        this.isLoading = false;
      },
    });
  }

  // V ProductPlanComponent.ts

  /** 🔹 Inicializácia formulára */
  initForm(item?: ProductPlanInterface) {
    this.itemForm = this.fb.group({
      id: [item?.id ?? null],
      plan_number: [{ value: item?.plan_number ?? '', disabled: true }],
      plan_type: [{ value: item?.plan_type ?? '', disabled: true }],
      start_date: [item?.start_date ?? '', Validators.required],
      end_date: [item?.end_date ?? '', Validators.required],
      items: this.fb.array(
        item?.items?.map((i) =>
          this.fb.group({
            id: [i.id ?? null],
            product: [{ value: i.product ?? '', disabled: false }],
            // Ak API vracia i.product_id (kód), použite ho. Ak nie, bude prázdne.
            product_id: [{ value: i.product_id ?? '', disabled: false }],

            // 🚨 KRITICKÁ ZMENA: Odstránené disabled: true, aby sa pole aktualizovalo cez patchValue
            product_name: [{ value: i.product_name ?? '', disabled: false }],

            planned_quantity: [i.planned_quantity ?? 0, [Validators.required, Validators.min(1)]],
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

    // =========================================================================
    // 🚨 KĽÚČOVÁ ZMENA: Spustenie Live Search pre existujúce položky
    // =========================================================================

    // Zabezpečí, že každý riadok formulára začne sledovať zmeny v inpute product_id
    if (this.itemsFormArray.length > 0) {
      this.itemsFormArray.controls.forEach((itemGroup: FormGroup, index: number) => {
        this.setupLiveSearchForItem(itemGroup, index);
      });
      console.log(`✅ Live Search obsluha zmien spustená pre ${this.itemsFormArray.length} riadkov.`);
    }
  }

  /** 🔹 Getter pre položky plánu */
  get itemsFormArray(): FormArray<FormGroup> {
    return (this.itemForm?.get('items') as FormArray<FormGroup>) || new FormArray<FormGroup>([]);
  }

  getIngredientsFormArray(itemGroup: FormGroup): FormArray<FormGroup> {
    const control = itemGroup.get('ingredients_status');
    return control instanceof FormArray ? control : new FormArray<FormGroup>([]);
  }

  toggleIngredients(index: number) {
    this.isExpanded[index] = !this.isExpanded[index];
  }


  /** 🔹 Hlavná metóda na uloženie Plánu a všetkých Položiek (nové/zmenené). */
  saveItem() {
    if (!this.itemForm?.valid) {
      this.notify.notify('Formulár nie je platný', 'warn');
      // Použitie logiky na zobrazenie chýb pre nevalidné pole (napr. this.itemForm.markAllAsTouched())
      return;
    }

    const formValue = this.itemForm.getRawValue();

    // 1. Príprava payloadu pre HLAVNÝ PLÁN (PATCH)
    const planPayload: Partial<ProductPlanInterface> = {};
    const planStartDateControl = this.itemForm.get('start_date');
    const planEndDateControl = this.itemForm.get('end_date');

    if (planStartDateControl?.dirty) {
      // Predpokladáme, že formValue.start_date je už string dátum
      planPayload.start_date = new Date(formValue.start_date).toISOString().slice(0, 10);
    }
    if (planEndDateControl?.dirty) {
      planPayload.end_date = new Date(formValue.end_date).toISOString().slice(0, 10);
    }

    // 2. Volanie pre HLAVNÝ PLÁN
    const planRequest$: Observable<ProductPlanInterface | null> =
      Object.keys(planPayload).length > 0
        ? this.productPlanService.updatePlan(formValue.id, planPayload)
        : of(null);

    // 3. Príprava zoznamu ZMENENÝCH / NOVÝCH POLOŽIEK

    // Zoznam pre existujúce položky, ktoré sa menia (PATCH)
    const changedItems: Partial<ProductPlanProductsInterface>[] = [];

    // Zoznam pre nové položky (POST)
    const newItemsToProcess: Partial<ProductPlanProductsInterface>[] = [];

    // Kľúče, ktoré sa môžu meniť/odosielať (vrátane 'product' po zmene cez Live Search)
    const updateableKeys = ['planned_quantity', 'planned_date', 'status', 'product'];

    this.itemsFormArray.controls.forEach((itemGroup: FormGroup) => {
      const itemId = itemGroup.get('id')?.value;
      // Rozpoznáme nové položky na základe dočasného ID
      const isNewItem = itemId > (this.nextAvailableTempId - 1);

      // ------------------------------------
      // A. NOVÁ POLOŽKA (POST)
      // ------------------------------------
      if (isNewItem) {
        if (!itemGroup.valid) {
          this.notify.notify(`Nová položka s dočasným ID ${itemId} nie je platná.`, 'error');
          return; // Preskočiť neplatnú položku
        }

        const fullPayload = itemGroup.getRawValue();

        // 🚨 KĽÚČOVÉ KROKY: Vyčistenie payloadu pre POST
        delete fullPayload.id; // Odstránime dočasné ID
        delete fullPayload.product_id; // 🚨 ODSTRÁNENIE UI POĽA PRE VYHĽADÁVANIE

        // Formátovanie dátumu, ak je potrebné
        if (fullPayload.planned_date) {
          fullPayload.planned_date = new Date(fullPayload.planned_date).toISOString().slice(0, 10);
        }

        // Nová položka ide do zoznamu na POST
        newItemsToProcess.push(fullPayload as Partial<ProductPlanProductsInterface>);

        // ------------------------------------
        // B. EXISTUJÚCA POLOŽKA (PATCH/UPDATE) - Pôvodná Logika zachovaná
        // ------------------------------------
      } else if (itemGroup.dirty) {

        // Základný payload s ID
        const itemPayload: Partial<ProductPlanProductsInterface> = {
          id: itemId,
        };

        let isItemDirty = false;

        // Filtrujeme len zmenené a povolené polia
        updateableKeys.forEach(key => {
          const control = itemGroup.get(key);

          if (control && control.dirty) {
            (itemPayload as any)[key] = control.value;
            isItemDirty = true;
          }
        });

        // 🚨 UI pole product_id NEPOSIELAME. Ak je dirty, znamená to zmenu 'product' ID, 
        // ktoré je už zahrnuté vďaka 'product' v updateableKeys.

        if (isItemDirty) {
          changedItems.push(itemPayload);
        }
      }
    });

    // 4. Reťazenie požiadaviek (Plán -> Položky)
    planRequest$.subscribe({
      next: () => {
        const allItemsToProcess = newItemsToProcess.length + changedItems.length;

        if (allItemsToProcess > 0) {
          // Zavoláme funkciu, ktorá spracuje POST aj PATCH
          this.handleItemsUpdate(newItemsToProcess, changedItems);

        } else if (Object.keys(planPayload).length > 0) {
          // Uložil sa len plán
          this.notify.notify('Plán bol úspešne uložený, položky bezo zmeny.');
          this.itemForm?.markAsPristine();
          this.loadAllItems();
        } else {
          // Žiadna zmena
          this.notify.notify('Neboli zistené žiadne zmeny na uloženie.', 'info');
        }
      },
      error: (err) => {
        console.error('❌ Error pri ukladaní plánu:', err);
        this.notify.notify('Chyba pri ukladaní plánu');
      },
    });
  }
  // V ProductPlanComponent.ts

  /**
   * 🔹 Hromadné spracovanie ukladania položiek: POST pre nové, PATCH pre zmenené.
   */
  private handleItemsUpdate(
    newItems: Partial<ProductPlanProductsInterface>[],
    changedItems: Partial<ProductPlanProductsInterface>[]
  ) {
    // ... (implementácia s forkJoin pre POST a PATCH volania) ...
    const requests: Observable<any>[] = [];

    newItems.forEach(item => {
      requests.push(this.productPlanService.createItemPlan(item));
    });

    changedItems.forEach(item => {
      if (item.id !== undefined && item.id !== null) {
        requests.push(this.productPlanService.updateItemPlan(item.id, item));
      }
    });

    forkJoin(requests).subscribe({
      next: () => {
        this.notify.notify('Všetky položky boli úspešne uložené/aktualizované.', 'success');
        this.itemForm?.markAsPristine();
        this.loadAllItems(); // Načítanie dát
      },
      error: (err) => {
        this.notify.notify('Chyba pri ukladaní položiek. Skontrolujte konzolu.', 'error');
        console.error(err);
      },
    });
  }
  private updateProductItems(items: ProductPlanProductsInterface[]) {
    const updateRequests: Observable<any>[] = [];

    items.forEach((item, index) => {
      if (!item.id) {
        console.warn(`Položka na indexe ${index} nemá ID a bola preskočená pri aktualizácii.`);
        return;
      }

      // 🚀 KĽÚČOVÁ ZMENA: Správne explicitné typovanie pre bodkovú notáciu
      const productUpdate: Partial<ProductPlanProductsInterface> = {};

      // --- Kontroly zmenených polí ---

      // Riadok 278: planned_quantity
      if (item.planned_quantity !== undefined) {
        productUpdate.planned_quantity = item.planned_quantity; // Chyba TS4111 je opravená
      }
      if (item.planned_date !== undefined) {
        // Formátovanie, len ak je pole prítomné (zmenené)
        productUpdate.planned_date = new Date(item.planned_date).toISOString().slice(0, 10);
      }
      if (item.status !== undefined) {
        productUpdate.status = item.status;
      }

      console.log(`📦 Item ID ${item.id} payload (pre PATCH):`, JSON.stringify(productUpdate));

      updateRequests.push(this.productPlanService.updateItemPlan(item.id, productUpdate));
    });

    if (updateRequests.length === 0) {
      this.notify.notify('Neboli zistené žiadne zmeny položiek na odoslanie', 'info');
      return;
    }

    // Spustenie VŠETKÝCH PATCH požiadaviek naraz
    // V ProductPlanComponent.ts, vnútri funkcie updateProductItems()

    forkJoin(updateRequests).subscribe({
      next: () => {
        this.notify.notify('Zmeny boli úspešne uložené');
        this.itemForm?.markAsPristine();
        this.loadAllItems();
      },
      error: (err) => {
        console.error('❌ Chyba pri ukladaní produktov', err);

        let errorMessage = 'Nastala neočakávaná chyba pri ukladaní produktov.';

        // 🚀 ÚPRAVA: Ak je chyba 400, pokúsime sa získať špecifickú správu z Django
        if (err.status === 400 && err.error && err.error.detail) {
          // Zachytenie tvojho {"detail": "Nie je možné meniť položku..."}
          errorMessage = err.error.detail;
        } else if (err.message) {
          // Pre iné typy chýb (napr. sieťové chyby)
          errorMessage = err.message;
        }

        // Zobrazenie zisteného chybového hlásenia
        this.notify.notify(errorMessage, 'warn');
      },
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

  private createItemFormGroup(item?: ProductPlanItemForm): FormGroup {
    let itemId = item?.id || null;
    if (itemId === null) {
      itemId = this.nextAvailableTempId++;
    }

    // 🚀 Teraz používame ProductPlanItemForm, ktorý obsahuje VŠETKY polia + product_id
    return this.fb.group<{ [key in keyof ProductPlanItemForm]: any }>({

      // 🔹 VŠETKY POLIA Z ProductPlanProductsInterface (Tieto CHÝBALI v chybovej správe!)
      id: [itemId],
      production_plan: [item?.production_plan || this.selectedItem?.id, Validators.required],
      product: [item?.product || null, Validators.required],

      // 🚨 TOTO SÚ TIE CHÝBAJÚCE POLIA, KTORÉ MUSÍTE PRIDAŤ:
      product_name: [item?.product_name || null], // <-- CHÝBALO
      planned_quantity: [item?.planned_quantity || 1, [Validators.required, Validators.min(1)]], // <-- CHÝBALO
      planned_date: [item?.planned_date || new Date().toISOString().slice(0, 10), Validators.required], // <-- CHÝBALO
      status: [item?.status || 'pending', Validators.required], // <-- CHÝBALO
      production_card: [item?.production_card || null],
      transfered_pcs: [item?.transfered_pcs || 0], // <-- CHÝBALO

      // 🟡 UI POLE (ktoré rozširuje formulár a je v ProductPlanItemForm)
      product_id: [item?.product_name ? item.product_id : ''], // Ak načítavame, ukážeme kód, inak prázdne

    }) as FormGroup;
  }

  /** 🔹 Pridá novú položku do itemsFormArray a nastaví fokus. */
  addNewItem() {
    if (!this.selectedItem || !this.itemForm) {
      this.notify.notify('Vyberte najprv plán, do ktorého chcete položku pridať.', 'warn');
      return;
    }

    // 1. Vytvor nový, prázdny FormGroup
    const newItemGroup = this.createItemFormGroup();

    // 2. Pridaj ho na koniec FormArray
    this.itemsFormArray.push(newItemGroup);

    // 3. Nastav index na poslednú položku (voliteľné, ak používaš selectedItemIndex)
    const newIndex = this.itemsFormArray.length - 1;
    this.selectedItemIndex = newIndex;

    // 🚨 CHÝBAJÚCI KROK: Spustenie Live Search pre nový riadok
    this.setupLiveSearchForItem(newItemGroup, newIndex);
    this.notify.notify(`Bol pridaný nový riadok s dočasným ID: ${newItemGroup.get('id')?.value}.`, 'info');



    // Voliteľné: Zroluj pohľad na spodok formulára, kde je nový riadok.
    setTimeout(() => {
      document.querySelector('.product-item:last-child')?.scrollIntoView({ behavior: 'smooth' });
    }, 0);
  }
  // V ProductPlanComponent.ts

  private setupLiveSearchForItem(itemGroup: FormGroup, index: number): void {
    // Používame pole 'product_id' pre UI vyhľadávanie
    const searchControl = itemGroup.get('product_id');

    // 💡 Nastavíme debounce pre zníženie frekvencie API volaní
    const sub = searchControl?.valueChanges.pipe(
      debounceTime(300), // Počká 300ms po poslednom stlačení klávesu
      distinctUntilChanged(), // Spustí sa len, ak sa hodnota naozaj zmenila

      // Zabezpečí, že neodosielame prázdny reťazec
      // filter((query: string) => query?.length > 2),

      // Volanie servisnej metódy s query
      switchMap((query: string) => {
        console.log(`🔎 Spúšťam API Live Search pre query: ${query}`); // <--- TOTO je to nové
        return this.productPlanService.loadAllProductForPlansSearch(query);
      }),
    ).subscribe((results: ProductPlanItemsInterface[]) => {
      console.log('➡️ API vrátilo výsledky (results):', results);
      const enteredCode = itemGroup.get('product_id')?.value;

      // Hľadáme produkt, ktorého product_id sa PRESNE zhoduje so zadaným kódom
      const foundProduct = results.find(
        p => p.product_id.toUpperCase() === enteredCode.toUpperCase()
      );

      if (foundProduct) {
        // Našla sa presná zhoda
        this.selectProductAndClose(index, foundProduct);
        this.notify.notify(`Produkt ${foundProduct.product_id} bol presne nájdený a vybraný.`, 'success');

      } else if (results.length > 0) {
        // Našli sa čiastočné zhody (napr. E00), ale nie presný kód (E003)
        this.notify.notify('Kód nájdený, ale nevyhovuje presnej zhode. Zadajte celý kód.', 'warn');

      } else {
        // Nenájdené
        this.notify.notify('Produkt nebol nájdený.', 'warn');
      }

      this.searchResultsMap.delete(index);
    });

    // ⚠️ POZOR: Mali by ste zabezpečiť, že sa toto Observable odhlási pri zničení komponentu.
    // Ak sa to neodhlasuje, môže to viesť k memory leaks.
  }

  // V ProductPlanComponent.ts

  /**
   * 🔹 Spracuje výber produktu z výsledkov Live Search.
   */
  selectProductAndClose(index: number, product: ProductPlanItemsInterface): void {
    const itemGroup = this.itemsFormArray.at(index) as FormGroup;
    // ===================================================
    // 💡 KONTROLA 1: Dáta prichádzajúce z Live Search (API)
    // ===================================================
    console.log(`✅ Vybraný produkt na indexe ${index}:`);
    console.log('API (product.id):', product.id);
    console.log('API (product.product_id):', product.product_id);
    console.log('API (product.product_name):', product.product_name);
    // Overte, že tieto hodnoty NIE SÚ undefined, null alebo prázdne!
    itemGroup.patchValue({
      // 🟢 ID produktu z výsledkov ide do cieľového poľa 'product'
      product: product.id,

      // Kód produktu pre UI (zobrazenie v inpute a nadpise)
      product_id: product.product_id,

      // Ostatné detaily
      product_name: product.product_name,
      planned_quantity: 1,

    });
    // ===================================================
    // 💡 KONTROLA 2: Hodnoty PO patchValue
    // ===================================================
    console.log('🔥 Hodnoty formulára po patchValue:');
    console.log('Form product (ID pre server):', itemGroup.get('product')?.value);
    console.log('Form product_id (Kód pre UI):', itemGroup.get('product_id')?.value);
    console.log('Form product_name (Názov pre nadpis):', itemGroup.get('product_name')?.value);

    // Zatvorí dropdown zoznam výsledkov a nastaví formulár ako zmenený
    this.searchResultsMap.delete(index);
    itemGroup.markAsDirty();
    this.notify.notify(`Produkt ${product.product_id} bol nastavený.`, 'success');
  }

}
