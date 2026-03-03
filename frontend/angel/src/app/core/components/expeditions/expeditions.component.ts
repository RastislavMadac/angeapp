import { Component, OnDestroy, OnInit, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
// MATERIAL & LAYOUTS
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { GenericTableComponent } from '../generic-table/generic-table.component';
import { MasterLayoutComponent } from '../master-layout/master-layout.component';
import { NavbarComponent } from '../navbar/navbar.component';
import { SmallNavbarComponent } from '../small-navbar/small-navbar.component';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner'
import { MatCheckboxChange } from '@angular/material/checkbox';

// SERVICES
import { NotificationService } from '../../servicies/notification.service';
import { UserService } from '../../servicies/user.service';
import { ButtonsService } from '../../servicies/buttons.service';
import { FilterService } from '../../servicies/filter.service';
import { ProductValidationService } from '../../servicies/checkItems.service';
import { ExpeditionService } from '../../servicies/expedition.service';

import { ActivatedRoute, Router } from '@angular/router'

// INTERFACES
import { TableColumn } from '../../interface/tablecolumnn.interface';
import { IExpedition, IExpeditionItem } from '../../interface/expedition.interface';
import { BehaviorSubject, combineLatest, debounceTime, distinctUntilChanged, map, Observable, Subject } from 'rxjs';



@Component({
  selector: 'app-expeditions',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, GenericTableComponent, MasterLayoutComponent, FormsModule,
    NavbarComponent, SmallNavbarComponent, MatButtonModule,
    MatIconModule, MatToolbarModule, MatTooltipModule, MatProgressSpinnerModule, MatCheckboxModule
  ],
  templateUrl: './expeditions.component.html',
  styleUrls: ['./expeditions.component.css']
})
export class ExpeditionsComponent implements OnInit, OnDestroy {
  isLoading = true;
  errorMessage = '';
  filteredData$: Observable<IExpedition[]>;
  private filterSubject = new BehaviorSubject<IExpedition[]>([]);
  private _items: IExpedition[] = [];
  get items(): IExpedition[] { return this._items; }
  set items(v: IExpedition[]) {

    this._items = v;
    console.groupEnd();
  }
  private _selectedItem: IExpedition | null = null;
  get selectedItem(): IExpedition | null { return this._selectedItem; }
  set selectedItem(v: IExpedition | null) {


    // Použijeme spread pre bezpečnú prácu s objektom
    this._selectedItem = v ? { ...v } : null;
    console.groupEnd();
  }
  private snInputSubject = new Subject<{ item: IExpeditionItem, value: string }>();
  highlightedItemId: number | null = null;

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    private notify: NotificationService,
    private buttonService: ButtonsService,
    private expeditionService: ExpeditionService,
    private filterService: FilterService,
    private productValidationService: ProductValidationService,
    private router: Router,
    private route: ActivatedRoute,
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
    this.loadAllexpeditions()

    this.snInputSubject.pipe(
      debounceTime(400), // Čakaj 400ms po poslednom znaku
      distinctUntilChanged((prev, curr) => prev.value === curr.value) // Ignoruj duplicity
    ).subscribe((data) => {

      // Až tu sa spustí akcia (po 400ms ticha)
      if (data.value.length > 2) {
        // Tu voláš svoju funkciu na VERIFIKÁCIU
        this.verifySn(data.item, data.value);
      }
    });

    this.checkUrlParams();
  }


  loadAllexpeditions() {
    if (!this.userService.isLoggedIn()) {
      this.errorMessage = 'Nie ste prihlásený';
      this.isLoading = false;
      return;
    }

    this.isLoading = true;
    this.expeditionService.loadAllExpeditions().subscribe({
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

  // Pridaj do ExpeditionsComponent
  selectedExpedition: IExpedition | null = null;
  scannedSn: string = '';

  // SÚBOR: expeditions.component.ts

  // SÚBOR: expeditions.component.ts

  selectItem(item: any, highlightId: number | null = null, snToFill: string | null = null) {
    console.log('🏗️ [EXPEDITIONS] selectItem volaný pre ID:', item.id);

    // 1. OKAMŽITÝ ZÁMOK: Nastavíme selectedItem hneď, aby UI neprebliklo
    this.selectedItem = item;
    this.isLoading = true;
    this.highlightedItemId = null; // Reset zvýraznenia pred načítaním

    // 2. Načítanie čerstvých dát z backendu
    this.expeditionService.getExpedition(item.id).subscribe({
      next: (data) => {
        this.selectedExpedition = data;
        this.isLoading = false;

        console.log('📦 [DEBUG] Dáta expedície načítané. Počet položiek:', this.selectedExpedition.items?.length);

        // 3. Logika pre zvýraznenie a doplnenie S/N (ak sme prišli z ItemCheck)
        if (highlightId) {
          // Nastavenie vizuálneho zvýraznenia riadku
          this.highlightedItemId = highlightId;
          setTimeout(() => { this.highlightedItemId = null; }, 3000);

          // Ak máme aj S/N na doplnenie
          if (snToFill) {
            console.log(`🔎 Hľadám položku s ID: ${highlightId}`);

            // Použijeme '==' pre porovnanie string vs number
            const foundItem = this.selectedExpedition.items.find((i: any) => i.id == highlightId);

            if (foundItem) {
              console.log('✅ POLOŽKA NÁJDENÁ. Dopĺňam S/N:', snToFill);

              // A) Nastavíme hodnotu do inputu
              foundItem.temp_sn_value = snToFill;

              // B) Tvárime sa, že validácia prebehla (aby sa zobrazilo tlačidlo POTVRDIŤ)
              foundItem.is_sn_validated = true;

              // ⚠️ DÔLEŽITÉ: NENASTAVUJEME foundItem.product_instance_serial!
              // Ak by sme to nastavili, input zmizne a zobrazí sa to ako hotové.
              // My chceme, aby technik videl vyplnený input a musel kliknúť na POTVRDIŤ,
              // čím sa zavolá API a reálne sa to priradí.

            } else {
              console.warn('❌ POLOŽKA NENÁJDENÁ. Dostupné IDčka:', this.selectedExpedition.items.map((i: any) => i.id));
            }
          }
        }
      },
      error: (err) => {
        this.notify.showError('Nepodarilo sa načítať detail expedície');
        this.isLoading = false;
        console.error(err);
      }
    });
  }
  // Túto funkciu voláš z HTML (input)
  onSnInput(item: IExpeditionItem, inputValue: string) {
    // 1. Zrušíme starú validáciu (aby zmizlo tlačidlo Potvrdiť, kým sa píše)
    item.is_sn_validated = false;

    // 2. Pošleme dáta do potrubia (Subjectu)
    this.snInputSubject.next({ item: item, value: inputValue });
  }

  ngOnDestroy() {
    this.snInputSubject.unsubscribe(); // Upratanie pamäte
  }
  columns: TableColumn[] = [
    { key: 'id', label: 'ID', type: 'text' },
    { key: 'order_number', label: 'Číslo objednávky', type: 'text' },
    { key: 'expedition_number', label: 'Číslo expedície', type: 'text' },
    { key: 'status', label: 'Status', type: 'text' },
    { key: 'stock_issue', label: 'Číslo výdajky', type: 'text' },

  ];

  deleteItem(expeditionId: number, itemId: number): void {
    // Čakáme na odpoveď (Promise/Observable)
    this.notify.confirm('Naozaj chcete odstrániť túto položku?').then((isConfirmed) => {

      if (isConfirmed) {
        this.isLoading = true;

        // Voláme backend až keď potvrdí
        this.expeditionService.deleteItem(expeditionId, itemId).subscribe({
          next: () => {
            // Aktualizácia zoznamu
            if (this.selectedExpedition) {
              this.selectedExpedition.items = this.selectedExpedition.items.filter(i => i.id !== itemId);
            }
            this.notify.showSuccess('Zmazané.');
            this.isLoading = false;
          },
          error: () => {
            this.notify.showError('Chyba.');
            this.isLoading = false;
          }
        });
      }
    });
  }
  closeDetail() {
    this.selectedExpedition = null;
    this.scannedSn = '';
    this.loadAllexpeditions(); // Refresh zoznamu
  }
  finishExpedition(): void {
    console.log("finishexpedition");
    if (!this.selectedExpedition) return;

    this.isLoading = true;
    this.expeditionService.patchExpedition(this.selectedExpedition.id, { status: 'ready' as any }).subscribe({
      next: (res) => {
        this.notify.success('Expedícia bola úspešne odoslaná (sklad odpísaný)');
        this.selectedExpedition = res;
        this.isLoading = false;
        this.loadAllexpeditions(); // Refreshneme hlavnú tabuľku
      },
      error: (err) => {
        this.notify.showError(err.error?.detail || 'Nepodarilo sa uzavrieť expedíciu');
        this.isLoading = false;
      }
    });
  }

  // Metóda na prepnutie stavu "správne"
  toggleCorrect(item: any) {
    // Ak už vlastnosť isCorrect neexistuje, Angular ju vytvorí
    item.isCorrect = !item.isCorrect;

    if (item.isCorrect) {
      this.notify.success(`${item.product_name} označené ako správne`);
    }
  }

  get allChecked(): boolean {
    // 1. Poistka: Ak nie je vybraná expedícia alebo je zoznam prázdny, vráť false
    if (!this.selectedExpedition || !this.selectedExpedition.items || this.selectedExpedition.items.length === 0) {
      return false;
    }

    // 2. Funkcia .every() prejde všetky položky. 
    // Vráti true iba vtedy, ak má KAŽDÁ položka isCorrect nastavené na true.
    return this.selectedExpedition.items.every(item => item.isCorrect === true);
  }


  openItemCheck(item: IExpeditionItem): void {
    console.log('Otváram kontrolu pre položku:', item.product_name);

    // MOŽNOSŤ A: Ak je itemCheck iná stránka (URL):
    // this.router.navigate(['/qc/check', item.id]); 

    // MOŽNOSŤ B: Ak je to Dialog (Modálne okno):
    /*
    const dialogRef = this.dialog.open(ItemCheckDialogComponent, {
      width: '600px',
      data: { item: item }
    });
  
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
         // Napr. označiť položku ako skontrolovanú
         item.isCorrect = true;
      }
    });
    */
  }

  // 1. FÁZA: Iba overenie (po stlačení Enter alebo tlačidla Kontrola)
  verifySn(item: IExpeditionItem, inputValue: string) {
    // 1. Očistíme vstup od medzier
    const sn = inputValue.trim();

    // Ak je prázdne, zrušíme validáciu a končíme
    if (!sn) {
      item.is_sn_validated = false;
      return;
    }

    this.isLoading = true;

    // 2. Volanie backendu na kontrolu S/N
    this.productValidationService.checkSnUnique(sn).subscribe({

      // PRIDANÉ ': any', aby TypeScript nekričal, že nepozná product_id
      next: (res: any) => {

        // A) Kontrola existencie v databáze
        if (!res.exists) {
          this.notify.showError(`S/N "${sn}" sa v systéme nenašiel!`);

          // Reset stavu
          item.is_sn_validated = false;
          this.isLoading = false;
          return; // Končíme
        }

        // B) Kontrola zhody produktu (Aby sme nepriradili S/N z iného tovaru)
        // Uisti sa, že item.product_id máš v Interface
        if (item.product_id && res.product_id !== item.product_id) {
          this.notify.showError(`Chyba! Toto S/N patrí inému produktu.`);

          // Reset stavu
          item.is_sn_validated = false;
          this.isLoading = false;
          return; // Končíme
        }

        // C) ÚSPECH - Všetko sedí
        this.notify.showSuccess('S/N je platné. Kliknite na POTVRDIŤ.');

        // Uložíme si hodnotu dočasne a povolíme tlačidlo Potvrdiť
        item.temp_sn_value = sn;
        item.is_sn_validated = true;

        this.isLoading = false;
      },

      // D) Chyba servera / siete
      error: (err) => {
        console.error(err);
        this.notify.showError('Chyba komunikácie pri overovaní S/N.');

        item.is_sn_validated = false;
        this.isLoading = false;
      }
    });
  }

  confirmSn(item: IExpeditionItem) {
    if (!item.temp_sn_value || !this.selectedExpedition) return;

    this.isLoading = true;

    const payload = {
      expedition: this.selectedExpedition.id,
      order_item: item.order_item,
      serial_number: item.temp_sn_value
    };

    this.expeditionService.assignSerial(payload).subscribe({
      next: (res) => {
        this.notify.showSuccess('S/N úspešne priradené.');

        item.product_instance_serial = item.temp_sn_value;
        item.isCorrect = true;
        delete item.is_sn_validated;
        delete item.temp_sn_value;

        this.isLoading = false;
      },

      error: (err) => {
        console.error('Backend Error:', err);
        this.isLoading = false; // Nezabudni vypnúť loading

        // Skratky k dátam chyby
        const errorData = err.error;
        const snError = errorData?.serial_number;

        // =========================================================
        // 1. PRIORITA: TVOJ ŠPECIFICKÝ JSON (Nested Object)
        // Formát: { serial_number: { code: "...", message: "...", product: {...} } }
        // =========================================================
        if (snError && typeof snError === 'object' && !Array.isArray(snError) && snError.message) {

          let userMsg = snError.message; // "Produkt už bol expedovaný..."

          // Ak backend poslal aj info o produkte, pridáme ho do zátvorky
          if (snError.product?.name) {
            userMsg += ` (${snError.product.name})`;
          }

          this.notify.showError(userMsg);
          return; // Chyba vybavená, končíme
        }

        // =========================================================
        // 2. FALLBACK: ŠTANDARDNÉ DJANGO CHYBY (Array / String)
        // =========================================================
        let fallbackMsg = 'Nepodarilo sa priradiť S/N.';

        if (errorData?.detail) {
          // Prípad: { "detail": "Chyba prístupu." }
          fallbackMsg = errorData.detail;
        }
        else if (Array.isArray(snError)) {
          // Prípad: { "serial_number": ["Toto pole je povinné."] }
          fallbackMsg = snError[0];
        }
        else if (errorData?.non_field_errors) {
          // Prípad: General validation errors
          fallbackMsg = Array.isArray(errorData.non_field_errors)
            ? errorData.non_field_errors[0]
            : errorData.non_field_errors;
        }
        else if (err.status >= 500) {
          fallbackMsg = 'Interná chyba servera.';
        }

        // Zobrazíme všeobecnú chybu aj so status kódom
        this.notify.showError(`${fallbackMsg} (Status: ${err.status})`);
      }
    });
  }

  onSmartCheckboxChange(item: IExpeditionItem, event: MatCheckboxChange) {

    // 1. Zistíme aktuálnu hodnotu (ak existuje temp, berieme tú, inak pôvodnú)
    // Použijeme Number(), lebo input vracia string
    const inputVal = item.temp_quantity ? Number(item.temp_quantity) : item.quantity;

    const isDirty = inputVal !== item.quantity;

    if (!event.checked) {
      item.isCorrect = false;
      // Vyčistíme temp, ak odznačil (voliteľné, pre poriadok)
      delete item.temp_quantity;
      return;
    }

    // Ak sa množstvo nezmenilo
    if (!isDirty || item.is_serialized) {
      item.isCorrect = true;
      return;
    }

    // Ak sa množstvo zmenilo -> PATCH
    event.source.checked = false;
    this.isLoading = true;

    this.expeditionService.updateItemQuantity(item.id, inputVal)
      .subscribe({
        next: () => {
          // Uložíme nové množstvo napevno
          item.quantity = inputVal;
          // Zmažeme dočasnú hodnotu, lebo už je zhodná s realitou
          delete item.temp_quantity;

          item.isCorrect = true;
          event.source.checked = true;

          this.notify.showSuccess(`Množstvo uložené (${inputVal} ks).`);
          this.isLoading = false;
        },
        error: (err) => {
          this.notify.showError('Chyba pri ukladaní množstva!');
          this.isLoading = false;
          // Checkbox ostane odznačený
        }
      });
  }

  goToInspection(item: IExpeditionItem, snValue: string) {
    if (!snValue || snValue.trim() === '') {
      this.notify.showError('Pre kontrolu musíte zadať alebo naskenovať S/N.');
      return;
    }

    const searchParam = item.product_code || item.product_name;

    // Ak máme vybranú expedíciu, vezmeme jej ID
    const currentExpeditionId = this.selectedExpedition ? this.selectedExpedition.id : null;

    this.router.navigate(['/itemcheck'], {
      queryParams: {
        product: searchParam,
        sn: snValue,
        // PRIDANÉ: Pošleme ID expedície, aby sme vedeli, kam sa vrátiť
        returnTo: currentExpeditionId,
        returnItem: item.id
      }
    });
  }

  private checkUrlParams() {
    console.log("checkUrlParams is running");
    this.route.queryParams.subscribe(params => {
      const openId = params['openId'];
      const highlightItem = params['highlightItem'];
      const filledSn = params['filledSn']; // <--- 1. Načítame SN z URL

      console.log("openId:", openId, "highlightItem:", highlightItem, "filledSn:", filledSn);

      if (openId) {
        // 2. Pošleme filledSn ako tretí parameter do selectItem
        this.selectItem(
          { id: Number(openId) },
          highlightItem ? Number(highlightItem) : null,
          filledSn || null
        );

        // Vyčistíme URL, aby sa to nespúšťalo pri reloade
        this.router.navigate([], {
          queryParams: { openId: null, highlightItem: null, filledSn: null },
          queryParamsHandling: 'merge'
        });
      }
    });
  }

  createExpedition(): void {
    // 1. Overenie (voliteľné, ale odporúčané)
    this.notify.confirm('Chcete vytvoriť novú manuálnu expedíciu?').then((isConfirmed) => {

      if (isConfirmed) {
        this.isLoading = true;

        // 2. Dáta pre novú expedíciu (záleží od tvojho backendu, čo vyžaduje)
        // Posielame aspoň status, prípadne prázdny objekt {}
        const payload: Partial<IExpedition> = {
          status: 'draft'
          // Tu by sa dalo pridať napr. created_at, poznámka atď.
        };

        // 3. Volanie backendu
        this.expeditionService.createExpedition(payload as any).subscribe({
          next: (newExpedition) => {
            this.notify.showSuccess('Nová expedícia úspešne vytvorená.');

            // 4. Refresh zoznamu
            this.loadAllexpeditions();

            // 5. Voliteľné: Rovno otvoriť detail novej expedície
            // this.selectItem(newExpedition); 

            this.isLoading = false;
          },
          error: (err) => {
            console.error(err);
            this.notify.showError('Nepodarilo sa vytvoriť expedíciu.');
            this.isLoading = false;
          }
        });
      }
    });
  }
}