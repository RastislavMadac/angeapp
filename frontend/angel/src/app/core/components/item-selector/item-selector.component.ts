import { Component, EventEmitter, Output, OnInit, OnDestroy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

import { FilterService } from '../../servicies/filter.service';
import { ProductIngredientService } from '../../servicies/productIngredient.service';
import { ProductService } from '../../servicies/product.service';
import { ProductIngredient } from '../../interface/productIngredient';
import { Product } from '../../interface/product.interface';
import { Observable } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { AddIngredientEvent } from '../../interface/newIngrredientEvent.interface';


@Component({
  selector: 'app-item-selector',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './item-selector.component.html',
  styleUrls: ['./item-selector.component.css']
})
export class ItemSelectorComponent implements OnInit, OnDestroy {


  @Input() productId!: number;
  @Input() productName?: string
  @Input() existingIngredients: ProductIngredient[] = [];

  @Output() close = new EventEmitter<void>()
  @Output() addIngredient = new EventEmitter<AddIngredientEvent>()


  constructor(
    private productIngredientService: ProductIngredientService,
    private filterService: FilterService,
    private productService: ProductService,
  ) {
    this.filters$ = this.filterService.filters$; // vyhľadávanie
  }

  ngOnInit() {
    console.log('Modal otvorený');
    document.body.classList.add('modal-open');
    this.loadAllIngrediets()
    console.log(this.items);
  }

  ngOnDestroy() {
    console.log('Modal zavretý');
    document.body.classList.remove('modal-open');
  }

  onClose() {
    this.close.emit()
  }



  // ---------- Vyhľadávanie/filtrovanie ----------
  filters$: Observable<string[]>;
  searchTerm = '';

  onSearchValue(value: string) {
    this.searchTerm = value;
    this.updateFilteredItems();
  }


  updateFilteredItems() {
    const filter = this.searchTerm.trim().toLowerCase();
    console.log('Search term:', filter);

    // iba suroviny
    let suroviny = this.items.filter(i => i.product_type_name?.toLowerCase() === 'surovina');
    console.log('Suroviny pred odstránením existujúcich:', suroviny);

    // odstránime tie, ktoré sú už pridané
    suroviny = suroviny.filter(i => !this.existingIngredients.some(ing => ing.ingredient_id === i.id));
    console.log('Suroviny po odstránení existujúcich:', suroviny);

    // ak je filter text, ďalej filtrujeme podľa mena
    if (filter) {
      suroviny = suroviny.filter(i => i.product_name.toLowerCase().includes(filter));
    }

    this.filteredItems = suroviny;
    console.log('FilteredItems:', this.filteredItems);
  }




  // ---------- Zobrazenie surovín ----------
  filteredItems: Product[] = []
  items: Product[] = []

  loadAllIngrediets() {
    this.productService.loadAllProduct().subscribe(items => {
      this.items = items;

      // hneď odfiltrujeme tie, ktoré už sú v ingredienciách
      this.updateFilteredItems();
    });
  }

  quantities: { [productId: number]: number } = {};


  onSelectIngredients(ing: Product) {
    const qty = this.quantities[ing.id] ?? 0;

    const ingredient: ProductIngredient = {
      id: 0,
      product_id: this.productId!,   // parent vždy pošle productId
      ingredient_id: ing.id,
      ingredient_name: ing.product_name,
      quantity: qty
    };

    const event: AddIngredientEvent = { ingredient, quantity: qty };
    this.addIngredient.emit(event);

    // reset množstva po pridaní
    this.quantities[ing.id] = 0;
  }



}