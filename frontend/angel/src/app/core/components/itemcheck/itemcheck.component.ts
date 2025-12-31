import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { combineLatest, map, BehaviorSubject, Observable, Subject, Subscription, debounceTime, distinctUntilChanged, switchMap, of, catchError } from 'rxjs';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';

// MATERIAL & LAYOUTS
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { GenericTableComponent } from '../generic-table/generic-table.component';
import { MasterLayoutComponent } from '../master-layout/master-layout.component';
import { NavbarComponent } from '../navbar/navbar.component';
import { SmallNavbarComponent } from '../small-navbar/small-navbar.component';

// SERVICES
import { NotificationService } from '../../servicies/notification.service';
import { UserService } from '../../servicies/user.service';
import { ButtonsService } from '../../servicies/buttons.service';
import { FilterService } from '../../servicies/filter.service';
import { ItemsCheckService } from '../../servicies/itemsCheck.service';
import { ProductValidationService } from '../../servicies/checkItems.service';
// INTERFACES
import { TableColumn } from '../../interface/tablecolumnn.interface';
import { IProductInspection } from '../../interface/itemCheck.interface';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-itemcheck',
  standalone: true,
  imports: [
    CommonModule, GenericTableComponent, MasterLayoutComponent,
    NavbarComponent, SmallNavbarComponent, MatButtonModule,
    MatIconModule, MatToolbarModule, MatTooltipModule, ReactiveFormsModule, MatProgressSpinnerModule
  ],
  templateUrl: './itemcheck.component.html',
  styleUrls: ['./itemcheck.component.css']
})
export class ItemcheckComponent implements OnInit, OnDestroy {
  isLoading = true;
  errorMessage = '';
  inspectionForm: FormGroup | null = null;
  filteredData$: Observable<IProductInspection[]>;
  private filterSubject = new BehaviorSubject<IProductInspection[]>([]);
  users: any[] = [];

  private searchSubject = new Subject<string>();
  private searchSubscription?: Subscription;
  foundProductName: string | null = null;
  isSearching = false;

  private _items: IProductInspection[] = [];
  get items(): IProductInspection[] { return this._items; }
  set items(v: IProductInspection[]) {

    this._items = v;
    console.groupEnd();
  }

  private _selectedItem: IProductInspection | null = null;
  get selectedItem(): IProductInspection | null { return this._selectedItem; }
  set selectedItem(v: IProductInspection | null) {
    console.group('%c[DEBUG] selectedItem.setter', 'color: green; font-weight: bold;');
    console.log('old id =', this._selectedItem?.id, 'new id =', v?.id);

    // Použijeme spread pre bezpečnú prácu s objektom
    this._selectedItem = v ? { ...v } : null;
    console.groupEnd();
  }

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    private notify: NotificationService,
    private buttonService: ButtonsService,
    private itemsCheckService: ItemsCheckService,
    private filterService: FilterService,
    private productValidationService: ProductValidationService
  ) {
    this.filteredData$ = combineLatest([
      this.filterSubject.asObservable(),
      this.filterService.filters$
    ]).pipe(
      map(([data, filters]) => {
        if (!filters.length) return data;
        return data.filter(item =>
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
    this.setupSnCheck();
    this.loadAllItemsChecks();
    this.loadUsers();
    this.setupProductLiveSearch();
    this.buttonService.add$.subscribe(() => this.createNewCheck());
  }

  private setupProductLiveSearch(): void {
    this.searchSubscription = this.searchSubject.pipe(
      debounceTime(400),
      distinctUntilChanged(),
      switchMap((code) => {
        if (!code || code.length < 1) return of(null);
        this.isSearching = true;
        return this.itemsCheckService.getProductByCode(code).pipe(
          catchError(() => {
            this.foundProductName = 'Produkt nenájdený';
            this.isSearching = false;
            return of(null);
          })
        );
      })
    ).subscribe((product) => {
      this.isSearching = false;

      if (product && this.inspectionForm) {
        console.log('✅ Priraďujem ID:', product.id);
        this.foundProductName = product.name;

        // Kľúčová oprava: 
        // 1. Nastavíme ID do poľa product_id
        this.inspectionForm.get('product_id')?.setValue(product.id);

        // 2. Ak chceš, aby sa v políčku "Sériové číslo" (kde píšeš) objavil 
        //    oficiálny kód z DB (ak je iný ako to, čo si písal):
        // this.inspectionForm.get('serial_number')?.setValue(product.product_id);

        this.inspectionForm.markAsDirty();
        this.notify.notify(`Produkt rozpoznaný: ${product.name}`, 'success');
      }
    });
  }
  onProductCodeInput(event: any): void {
    const val = event.target.value;
    this.searchSubject.next(val);
  }

  ngOnDestroy(): void {
    // Čistenie pri zničení komponentu
    this.searchSubscription?.unsubscribe();
    this.searchSubject.complete();
  }
  loadUsers() {
    // Predpokladám, že userService má metódu na získanie zoznamu
    this.userService.loadAllUsers().subscribe({
      next: (data) => this.users = data,
      error: (err) => console.error('Nepodarilo sa načítať používateľov', err)
    });
  }
  loadAllItemsChecks() {
    if (!this.userService.isLoggedIn()) {
      this.errorMessage = 'Nie ste prihlásený';
      this.isLoading = false;
      return;
    }

    this.isLoading = true;
    this.itemsCheckService.loadAllCheck().subscribe({
      next: items => {
        this.items = items;
        if (!this.selectedItem && this.items.length > 0) {
          this.selectItem(this.items[0]);
        }
        this.filterSubject.next(this.items);
        this.isLoading = false;
      },
      error: err => {
        this.errorMessage = 'Chyba načítania dát';
        this.isLoading = false;
        console.error(err);
      }
    });
  }

  // ---- FORMULÁR ----
  // Upravený formulár
  initForm(item?: Partial<IProductInspection>) {
    this.inspectionForm = this.fb.group({
      product_id: [item?.product_id || null, Validators.required],
      serial_number: [item?.instance_serial_number || '', Validators.required],
      manufacture_date: [item?.manufacture_date || this.getTodayDate(), Validators.required],
      manufactured_by: [item?.manufactured_by || null, Validators.required],
      visual_check: [item?.visual_check === true ? true : false],
      packaging_check: [item?.packaging_check === true ? true : false],
      defect_status: [item?.defect_status || 'none', Validators.required],
      defect_description: [item?.defect_description || ''],
      approved_for_shipping: [item?.approved_for_shipping ?? false]
    });
  }
  getTodayDate(): string {
    return new Date().toISOString().split('T')[0];
  }

  openProductLookup() {
    console.log('Otváram výber produktu...');
    // Tu neskôr pridáš logiku pre modálne okno s hľadaním produktov
  }

  get isLocked(): boolean {
    return this.selectedItem?.id ? this.inspectionForm?.get('defect_status')?.value === 'ok' : false;
  }
  // ---- VÝBER RIADKU (Logika z Orders) ----
  async selectItem(item: IProductInspection) {
    console.log('%c[DEBUG] selectItem called', 'color: purple', item.id);

    if (this.inspectionForm?.dirty) {
      const ok = await this.notify.confirm('Máte neuložené zmeny. Chcete ich uložiť?');
      if (ok) await this.saveCheck();
    }

    this.selectedItem = item;

    if (!this.inspectionForm) {
      this.initForm(this.selectedItem);
    } else {
      // Pred patchovaním formulár povolíme, aby sa dáta správne zapísali
      this.inspectionForm.enable();
      this.inspectionForm.patchValue({
        ...this.selectedItem,
        serial_number: this.selectedItem.instance_serial_number
      });
    }

    // Ak je status 'ok', formulár deaktivujeme
    if (this.isLocked) {
      this.inspectionForm?.disable();
    } else {
      this.inspectionForm?.enable();
    }

    this.inspectionForm?.markAsPristine();
  }

  async saveCheck() {
    if (!this.inspectionForm) return;

    // 1. Základná validácia frontendu
    if (this.inspectionForm.invalid) {
      this.notify.warn('Prosím, vyplňte všetky povinné polia.');
      return;
    }

    // 2. Kontrola, či je vybraný stav
    const status = this.inspectionForm.get('defect_status')?.value;
    if (status === 'none') {
      this.notify.showWarning('Musíte vybrať výsledný stav (OK alebo CHYBA).');
      return;
    }

    // 3. CONFIRM LOGIKA: Pýtame sa len, ak sa chystá schválenie na expedíciu (uzamknutie)
    const isApproving = this.inspectionForm.get('approved_for_shipping')?.value === true;

    if (isApproving) {
      const confirmed = await this.notify.confirm(
        'Pozor: Schválením na expedíciu sa tento záznam uzamkne a nebude ho možné neskôr meniť. Naozaj chcete pokračovať?'
      );

      if (!confirmed) {
        return; // Technik klikol na "Nie", zastavíme ukladanie
      }
    }

    // 4. Samotné odosielanie dát
    this.isLoading = true;
    const formData = this.inspectionForm.getRawValue();

    const saveObservable = this.selectedItem?.id
      ? this.itemsCheckService.updateCheck(this.selectedItem.id, formData)
      : this.itemsCheckService.createCheck(formData);

    saveObservable.subscribe({
      next: (response) => {
        this.isLoading = false;
        this.notify.success('Kontrola bola úspešne uložená a uzamknutá.');
        this.loadAllItemsChecks();
        this.selectItem(response); // Prepne na detail
        this.inspectionForm?.markAsPristine();
      },
      error: (err) => {
        this.handleServerError(err); // Spracuje chyby z Django Serializeru
      }
    });
  }
  /**
   * Pomocná funkcia na preklad názvov polí z backendu do ľudskej reči
   */
  private translateFieldName(field: string): string {
    const translations: { [key: string]: string } = {
      'visual_check': 'Vizuálna kontrola',
      'packaging_check': 'Balenie',
      'defect_status': 'Status chybovosti',
      'serial_number': 'Sériové číslo',
      'manufacture_date': 'Dátum výroby',
      'manufactured_by': 'Pracovník výroby',
      'product_id': 'Produkt',
      'approved_for_shipping': 'Expedícia'
    };
    return translations[field] || field;
  }



  /**
   * Spracovanie chýb z Django Serializeru
   */
  private handleServerError(err: any) {
    this.isLoading = false;

    if (err.status === 400 && err.error) {
      const serverErrors = err.error;
      let combinedMessage = '';

      Object.keys(serverErrors).forEach(field => {
        const messages = serverErrors[field];
        const displayMsg = Array.isArray(messages) ? messages[0] : messages;
        const friendlyFieldName = this.translateFieldName(field);

        // Spájame chyby do jedného textu s novým riadkom
        combinedMessage += `• ${friendlyFieldName}: ${displayMsg}\n`;
      });

      this.notify.showError(combinedMessage);
    } else {
      const msg = err.error?.detail || 'Chyba servera';
      this.notify.showError(msg);
    }
  }
  createNewCheck() {

    this.selectedItem = null;
    this.foundProductName = null;
    this.initForm({
      visual_check: false,
      packaging_check: false,
      defect_status: 'none',
      approved_for_shipping: false
    });
    // Pri novej kontrole musí byť formulár vždy editovateľný
    this.inspectionForm?.enable();
    this.inspectionForm?.markAsPristine();
  }


  columns: TableColumn[] = [
    { key: 'id', label: 'id cislo', type: 'text' },
    { key: 'instance_serial_number', label: 'Sériové číslo', type: 'text' },
    { key: 'product_name', label: 'Produkt', type: 'text' },
    { key: 'defect_status', label: 'Stav', type: 'text' },
    { key: 'checked_by', label: 'Kontroloval', type: 'text' },
    { key: 'approved_for_shipping', label: 'Expedícia', type: 'boolean' }
  ];


  // --- 1. Definuj premenné v triede ---
  isSnUnique: boolean | null = null; // null = neznáme, true = voľné (zelená), false = obsadené (červená)
  private snSubject = new Subject<string>();

  // --- 2. V ngOnInit pridaj inicializáciu ---


  // --- 3. Samotná logika kontroly ---
  private setupSnCheck(): void {
    this.snSubject.pipe(
      debounceTime(400),        // Počkáme, kým technik dopíše/doskenuje
      distinctUntilChanged(),   // Iba ak sa hodnota zmenila
      switchMap(sn => {
        if (!sn || sn.length < 3) {
          this.isSnUnique = null;
          return of(null);
        }
        return this.productValidationService.checkSnUnique(sn).pipe(
          catchError(() => {
            this.isSnUnique = null;
            return of(null);
          })
        );
      })
    ).subscribe(res => {
      if (res) {
        // Ak exists === true, znamená to, že S/N už je v DB -> NIE JE unikátne
        this.isSnUnique = !res.exists;
      }
    });
  }

  // --- 4. Metóda pre HTML input ---
  onSnInput(event: any) {
    const val = event.target.value;
    this.snSubject.next(val);
  }
}