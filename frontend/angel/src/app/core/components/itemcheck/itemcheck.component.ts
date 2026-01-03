import { Component, OnDestroy, OnInit, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
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

import { ActivatedRoute, Router } from '@angular/router';
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
  @ViewChild('productInput') productInput!: ElementRef;
  @ViewChild('serialInput') serialInput!: ElementRef;
  @ViewChild('operatorSelect') operatorSelect!: ElementRef;
  @ViewChild('visualCard') visualCard!: ElementRef;
  @ViewChild('packagingCard') packagingCard!: ElementRef;
  @ViewChild('okBtn') okBtn!: ElementRef;
  @ViewChild('errorBtn') errorBtn!: ElementRef;
  @ViewChild('dateInput') dateInput?: ElementRef;


  isLoading = true;
  errorMessage = '';
  inspectionForm: FormGroup | null = null;
  filteredData$: Observable<IProductInspection[]>;
  private filterSubject = new BehaviorSubject<IProductInspection[]>([]);
  users: any[] = [];
  private subs = new Subscription();
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

  returnExpeditionId: number | null = null;
  returnItemId: number | null = null;

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    private notify: NotificationService,
    private buttonService: ButtonsService,
    private itemsCheckService: ItemsCheckService,
    private filterService: FilterService,
    private productValidationService: ProductValidationService,
    private route: ActivatedRoute,
    private router: Router
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
    // 1. TOTO DAJ UPLNE HORE
    console.log('🏁 [START] ItemcheckComponent sa inicializuje...');

    try {
      this.setupSnCheck();
    } catch (e) { console.error('❌ Chyba v setupSnCheck:', e); }

    this.loadAllItemsChecks();
    this.loadUsers();
    this.setupProductLiveSearch();

    // 2. Častý zdroj chýb: Je buttonService injectnutý správne?
    if (this.buttonService && this.buttonService.add$) {
      this.buttonService.add$.subscribe(() => this.createNewCheck());
    } else {
      console.error('⚠️ buttonService nie je definovaný!');
    }

    // 3. Tvoje volanie
    console.log('📞 [DEBUG] Volám checkUrlParams()...');
    this.checkUrlParams();
  }
  // Pridaj túto metódu
  focusOperator() {
    setTimeout(() => {
      if (this.operatorSelect && this.operatorSelect.nativeElement) {
        this.operatorSelect.nativeElement.focus();
        // Ak chceš, aby sa select rovno otvoril (v niektorých prehliadačoch):
        // this.operatorSelect.nativeElement.click(); 
      }
    }, 100);
  }
  private setupProductLiveSearch(): void {
    this.searchSubscription = this.searchSubject.pipe(
      debounceTime(400),
      distinctUntilChanged(),
      switchMap((code) => {
        if (!code || code.length < 1) {
          this.foundProductName = null;
          return of(null);
        }
        this.isSearching = true;
        return this.itemsCheckService.getProductByCode(code).pipe(
          catchError(() => {
            this.foundProductName = 'Produkt nenájdený';
            this.isSearching = false;
            this.inspectionForm?.get('product_id')?.setValue(null);
            return of(null);
          })
        );
      })
    ).subscribe((product) => {
      this.isSearching = false;

      if (product && this.inspectionForm) {
        console.log('✅ Produkt načítaný z API:', product.name);
        this.foundProductName = product.name;

        // 1. Nastavíme ID produktu do formulára
        this.inspectionForm.get('product_id')?.setValue(product.id);
        this.inspectionForm.markAsDirty();
        this.notify.notify(`Produkt rozpoznaný: ${product.name}`, 'success');

        // 🛑 LOGIKA: Pozrieme sa, či máme odložené S/N z URL
        if (this.pendingSnFromUrl) {
          console.log('🔗 Mám odložené S/N, teraz ho dopĺňam:', this.pendingSnFromUrl);

          // A) Vyplníme S/N do formulára
          this.inspectionForm.patchValue({ serial_number: this.pendingSnFromUrl });

          // B) Vyplníme S/N do HTML Inputu a dáme tam focus
          if (this.serialInput) {
            this.serialInput.nativeElement.value = this.pendingSnFromUrl;
            this.serialInput.nativeElement.focus();
          }

          // C) Spustíme validáciu S/N (či je unikátne)
          this.snSubject.next(this.pendingSnFromUrl);

          // D) Vymažeme pamäť, aby sa to nespúšťalo znova
          this.pendingSnFromUrl = null;

        } else {
          // Bežný stav (ak S/N nebolo v URL) -> Len presunieme kurzor na S/N
          setTimeout(() => {
            if (this.serialInput) {
              this.serialInput.nativeElement.focus();
            }
          }, 100);
        }

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

  // 4. POMOCNÉ METÓDY PRE FOCUS A OVLÁDANIE
  focusCard(type: 'visual' | 'packaging') {
    if (type === 'visual') this.visualCard.nativeElement.focus();
    else this.packagingCard.nativeElement.focus();
  }
  focusStatus(type: 'ok' | 'error') {
    if (type === 'ok') this.okBtn.nativeElement.focus();
    else this.errorBtn.nativeElement.focus();
  }

  toggleCheck(type: 'visual' | 'packaging') {
    if (!this.inspectionForm) return;

    const controlName = type === 'visual' ? 'visual_check' : 'packaging_check';
    const control = this.inspectionForm.get(controlName);

    if (control) {
      const newVal = !control.value;
      this.inspectionForm.patchValue({ [controlName]: newVal });

      if (type === 'visual') {
        // Ak technik práve potvrdil vizuál, skoč na balenie
        this.focusCard('packaging');
      } else if (type === 'packaging' && newVal === true) {
        // Ak technik práve potvrdil balenie, skoč na výber statusu OK
        this.focusStatus('ok');
      }
    }
  }
  // Pomocné navigácie
  focusDate() { setTimeout(() => this.dateInput?.nativeElement?.focus(), 100); }
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

  // UPRAVENÝ GETTER
  get isLocked(): boolean {
    // Ak nie je vybraná položka, nie je čo zamykať
    if (!this.selectedItem?.id) return false;

    // Zámok aktivujeme LEN ak už v databáze (selectedItem) bolo schválené shipping.
    // To znamená, že ak opravuješ CHYBU, selectedItem.approved_for_shipping je FALSE,
    // takže isLocked bude FALSE a tlačidlo bude ODOMKNUTÉ.
    return this.selectedItem.approved_for_shipping === true;
  }

  // SÚBOR: itemcheck.component.ts

  async selectItem(item: IProductInspection) {
    console.log('%c[DEBUG] selectItem called', 'color: purple', item.id);

    // 1. Ochrana pred stratou neuložených dát
    if (this.inspectionForm?.dirty) {
      const ok = await this.notify.confirm('Máte neuložené zmeny. Chcete ich uložiť?');
      if (ok) {
        await this.saveCheck();
      }
    }

    // 2. Nastavenie vybranej položky
    this.selectedItem = item;

    // 3. Aktualizácia UI - názov produktu v zelenej karte
    this.foundProductName = item.product_name || null;
    this.isSnUnique = null;

    // 4. Inicializácia alebo naplnenie formulára
    if (!this.inspectionForm) {
      this.initForm(this.selectedItem);
    } else {
      this.inspectionForm.enable(); // Povolíme pred zápisom
      this.inspectionForm.patchValue({
        ...this.selectedItem,
        serial_number: this.selectedItem.instance_serial_number,
        product_id: this.selectedItem.product_id
      });
    }

    // 5. Zamknutie formulára, ak je už expedovaný
    if (this.isLocked) {
      this.inspectionForm?.disable();
    } else {
      this.inspectionForm?.enable();
    }

    // 6. Reset príznaku zmien
    this.inspectionForm?.markAsPristine();
  }
  async saveCheck() {
    if (!this.inspectionForm) return;

    this.isLoading = true;
    let request$;

    if (this.selectedItem?.id) {
      // --- UPDATE (PATCH) ---
      // Získame len to, čo technik zmenil
      const dirtyData = this.getDirtyValues(this.inspectionForm);

      // Ak nič nezmenil, ani neposielame request
      if (Object.keys(dirtyData).length === 0) {
        this.notify.info('Neboli vykonané žiadne zmeny.');
        this.isLoading = false;
        return;
      }

      request$ = this.itemsCheckService.updateCheck(this.selectedItem.id, dirtyData);
    } else {
      // --- CREATE (POST) ---
      if (this.inspectionForm.invalid) {
        this.notify.warn('Prosím, vyplňte povinné polia.');
        this.isLoading = false;
        return;
      }
      request$ = this.itemsCheckService.createCheck(this.inspectionForm.getRawValue());
    }

    request$.subscribe({
      next: (res) => {
        this.isLoading = false;
        this.inspectionForm?.markAsPristine();
        this.notify.success('Zmeny boli úspešne uložené (PATCH).');
        this.closeDetail();
        this.loadAllItemsChecks();
      },
      error: (err) => {
        this.isLoading = false;
        this.handleServerError(err);
      }
    });
  }

  addTextStamp() {
    if (!this.inspectionForm || this.isLocked) return;

    const control = this.inspectionForm.get('defect_description');
    const currentText = control?.value || '';

    // Vytvoríme časovú pečiatku: [DD.MM.YYYY HH:MM]: 
    const now = new Date();
    const dateStr = now.toLocaleDateString('sk-SK');
    const timeStr = now.getHours() + ':' + now.getMinutes().toString().padStart(2, '0');
    const stamp = `[${dateStr} ${timeStr}]: `;

    // Ak už v poli nejaký text je, pridáme pečiatku na nový riadok. 
    // Ak je pole prázdne, dáme ju na začiatok.
    const newText = currentText ? `${currentText}\n${stamp}` : stamp;

    this.inspectionForm.patchValue({ defect_description: newText });
  }

  // SÚBOR: itemcheck.component.ts

  closeDetail() {
    console.log('🛑 [ITEMCHECK] closeDetail volané.');

    // 1. SCENÁR: Návrat do expedície (ak sme sem prišli cez tlačidlo "Kontrola")
    if (this.returnExpeditionId) {
      console.log('🔙 Vraciam sa do expedície ID:', this.returnExpeditionId);

      const navParams: any = {
        openId: this.returnExpeditionId
      };

      // A) Pridáme ID položky na zvýraznenie (aby riadok blikol)
      if (this.returnItemId) {
        navParams.highlightItem = this.returnItemId;
      }

      // B) Pridáme S/N z formulára (TOTO JE KĽÚČOVÉ PRE PREDVYPLNENIE)
      // Zistíme, čo je aktuálne napísané v poli serial_number
      if (this.inspectionForm) {
        const snValue = this.inspectionForm.get('serial_number')?.value;

        // Posielame iba ak tam niečo je
        if (snValue) {
          navParams.filledSn = snValue;
        }
      }

      console.log('🚀 Parametre navigácie:', navParams);

      // C) Samotné presmerovanie
      this.router.navigate(['/expeditions'], {
        queryParams: navParams
      });

      // Reset pomocných premenných, aby sa to nepomiešalo pri ďalšom otvorení
      this.returnExpeditionId = null;
      this.returnItemId = null;
      return; // Ukončíme funkciu, lebo odchádzame zo stránky
    }

    // 2. SCENÁR: Bežné zavretie (ak sme len prezerali zoznam kontrol cez menu)
    console.log('❌ Žiadny návrat, ostávam na zozname kontrol a čistím formulár.');

    this.selectedItem = null;
    this.inspectionForm = null;
    this.foundProductName = null;
    this.isSnUnique = null;

    // Voliteľné: Refresh zoznamu, ak si niečo uložil
    this.loadAllItemsChecks();
  }
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

  // Pomocná funkcia na získanie iba zmenených hodnôt
  getDirtyValues(form: any): any {
    const dirtyValues: any = {};

    Object.keys(form.controls).forEach(key => {
      const currentControl = form.controls[key];
      if (currentControl.dirty) {
        dirtyValues[key] = currentControl.value;
      }
    });

    return dirtyValues;
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

    this.selectedItem = { id: 0 } as any;
    this.foundProductName = null;
    this.initForm({
      visual_check: false,
      packaging_check: false,
      defect_status: 'none',
      approved_for_shipping: false
    });
    setTimeout(() => this.productInput.nativeElement.focus(), 100);
    // Pri novej kontrole musí byť formulár vždy editovateľný
    this.inspectionForm?.enable();
    this.inspectionForm?.markAsPristine();
  }


  columns: TableColumn[] = [
    { key: 'id', label: 'ID', type: 'text' },
    { key: 'instance_serial_number', label: 'Sériové číslo', type: 'text' },
    { key: 'product_name', label: 'Produkt', type: 'text' },
    { key: 'manufacture_date', label: 'Dátum výroby', type: 'text' }, // Pridané: Kedy
    { key: 'manufactured_by_name', label: 'Vyrobil', type: 'text' },   // Pridané: Kto (Meno)
    { key: 'defect_status', label: 'Stav', type: 'text' },
    { key: 'checked_by', label: 'Kontroloval', type: 'text' },
    { key: 'approved_for_shipping', label: 'Expedícia', type: 'boolean' }
  ];


  // --- 1. Definuj premenné v triede ---
  isSnUnique: boolean | null = null; // null = neznáme, true = voľné (zelená), false = obsadené (červená)
  private snSubject = new Subject<string>();

  // --- 2. V ngOnInit pridaj inicializáciu ---


  // --- 3. Samotná logika kontroly ---
  private setupSnCheck() {
    const sub = this.snSubject.pipe(
      debounceTime(400),
      distinctUntilChanged(),
      switchMap(sn => {
        if (!sn || sn.length < 3) {
          this.isSnUnique = null;
          return of(null);
        }
        return this.productValidationService.checkSnUnique(sn).pipe(
          catchError(() => of(null))
        );
      })
    ).subscribe(res => {
      if (res) {
        this.isSnUnique = !res.exists;

        // OPRAVA: Ak je S/N unikátne, skočíme na DÁTUM VÝROBY
        if (this.isSnUnique === true) {
          setTimeout(() => {
            this.dateInput?.nativeElement?.focus();
          }, 100);
        }
      }
    });
    this.subs.add(sub);
  }
  // --- 4. Metóda pre HTML input ---
  onSnInput(event: any) {
    const val = event.target.value;
    this.snSubject.next(val);
  }

  setCurrentDate() {
    if (!this.inspectionForm || this.isLocked) return;

    const dateControl = this.inspectionForm.get('manufacture_date');

    // Kontrola existencie (odstráni chybu 'possibly null')
    if (dateControl && !dateControl.value) {
      const today = new Date().toISOString().split('T')[0];

      dateControl.patchValue(today);
      dateControl.markAsDirty(); // Teraz je to bezpečné
      dateControl.updateValueAndValidity();
    }
  }

  addNoteStamp() {
    if (!this.inspectionForm || this.isLocked) return;

    const control = this.inspectionForm.get('defect_description');

    // Overíme, či control existuje
    if (control) {
      const currentVal = control.value || '';

      if (!currentVal.trim()) {
        const now = new Date();
        const dateStr = now.toLocaleDateString('sk-SK');
        const timeStr = now.getHours() + ':' + now.getMinutes().toString().padStart(2, '0');
        const stamp = `[${dateStr} ${timeStr}]: `;

        control.patchValue(stamp);
        control.markAsDirty(); // Označíme ako dirty pre PATCH request
        control.updateValueAndValidity();
      }
    }
  }

  setStatus(status: 'ok' | 'error') {
    if (this.isLocked || !this.inspectionForm) return;

    const form = this.inspectionForm;

    // 1. Nastavíme samotný status
    form.get('defect_status')?.patchValue(status);
    form.get('defect_status')?.markAsDirty();

    // 2. Ak opravujeme na "OK", musíme "podpísať" aj kontroly
    if (status === 'ok') {
      // Vizuálna kontrola
      form.get('visual_check')?.patchValue(true);
      form.get('visual_check')?.markAsDirty();

      // Kontrola balenia
      form.get('packaging_check')?.patchValue(true);
      form.get('packaging_check')?.markAsDirty();

      // Ak predtým nebol vybratý dátum, skúsime ho doplniť (voliteľné)
      if (!form.get('manufacture_date')?.value) {
        this.setCurrentDate();
      }
    } else {
      // Ak prepneme na ERROR, automaticky vypneme expedíciu
      form.get('approved_for_shipping')?.patchValue(false);
      form.get('approved_for_shipping')?.markAsDirty();
    }

    // Pre istotu prepočítame validitu celého formulára
    form.updateValueAndValidity();
  }
  // SÚBOR: itemcheck.component.ts
  pendingSnFromUrl: string | null = null;
  private checkUrlParams() {
    console.log("checkUrlParams volane");

    this.route.queryParams.subscribe(params => {
      const productVal = params['product'];
      const snVal = params['sn'];

      // Načítame ID pre návrat
      const urlReturnId = params['returnTo'];
      const urlReturnItem = params['returnItem'];

      // Uložíme do premenných triedy (aby fungovalo tlačidlo Späť/Zavrieť)
      if (urlReturnId) this.returnExpeditionId = Number(urlReturnId);
      if (urlReturnItem) this.returnItemId = Number(urlReturnItem);

      // Ak máme kód produktu, začíname
      if (productVal) {
        this.createNewCheck(); // Reset formulára

        // 🛑 LOGIKA: Ak ideme z expedície (máme urlReturnId) A MÁME S/N,
        // tak si S/N odložíme na neskôr. Ešte ho nevyplňame do formulára!
        if (urlReturnId && snVal) {
          console.log('Ide o kontrolu z expedície -> Odkladám si S/N na neskôr.');
          this.pendingSnFromUrl = snVal;
        }

        // 1. Vyplníme Input PRODUKTU (aby to technik videl)
        if (this.productInput) {
          this.productInput.nativeElement.value = productVal;
        }

        // 2. Spustíme hľadanie produktu v API
        // (Toto aktivuje setupProductLiveSearch)
        this.searchSubject.next(productVal);
      }
    });
  }
}