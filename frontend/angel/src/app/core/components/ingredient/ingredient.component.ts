import { Component, OnInit, Input, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MasterLayoutComponent } from '../master-layout/master-layout.component';
import { NavbarComponent } from '../navbar/navbar.component';
import { ProductService } from '../../servicies/product.service';
import { ProductIngredientService } from '../../servicies/productIngredient.service';
import { UserService } from '../../servicies/user.service';
import { NotificationService } from '../../servicies/notification.service';
import { TableColumn } from '../../interface/tablecolumnn.interface';
import { GenericTableComponent } from '../generic-table/generic-table.component';
import { Product } from '../../interface/product.interface';
import { ProductIngredient } from '../../interface/productIngredient';
import { ItemSelectorComponent } from '../item-selector/item-selector.component';
import { AddIngredientEvent } from '../../interface/newIngrredientEvent.interface';

@Component({
  selector: 'app-product-ingredient',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule,
    MasterLayoutComponent, GenericTableComponent, NavbarComponent, ItemSelectorComponent
  ],
  templateUrl: './ingredient.component.html',
  styleUrls: ['./ingredient.component.css']
})
export class ProductIngredientComponent implements OnInit {

  isLoading = true;
  errorMessage = '';

  @Input() productId?: number;

  product: Product[] = [];
  selectedProduct: Product | null = null;
  ingredients: ProductIngredient[] = [];
  allSuroviny: Product[] = [];
  selectedIngredient: ProductIngredient | null = null;
  showModal = false;

  ingredientForm: FormGroup;

  filterText: string = '';



  columns: TableColumn[] = [
    { key: 'id', label: 'Kód', type: 'number' },
    { key: 'product_name', label: 'Názov produktu', type: 'text' },
    { key: 'product_type_name', label: 'Typ karty', type: 'text' },
    { key: 'is_serialized', label: 'Sériový', type: 'boolean' }
  ];

  constructor(
    private fb: FormBuilder,
    private productIngredientsService: ProductIngredientService,
    private productService: ProductService,
    private userService: UserService,
    private notify: NotificationService,
    private cdr: ChangeDetectorRef
  ) {
    this.ingredientForm = this.fb.group({
      ingredient_id: [null, Validators.required],
      quantity: [1, [Validators.required, Validators.min(0.01)]]
    });
  }

  ngOnInit(): void {
    this.loadProducts();
    this.loadAllSuroviny();
  }


  private loadProducts() {
    if (!this.userService.isLoggedIn()) {
      this.errorMessage = 'Nie ste prihlásený';
      this.isLoading = false;
      return;
    }

    this.isLoading = true;
    this.productIngredientsService.loadAllProduct().subscribe({
      next: products => {
        this.product = products.map(p => ({ ...p, is_serialized: Boolean(p.is_serialized) }));
        this.isLoading = false;

        if (this.product.length > 0) {
          this.handleRowClick(this.product[0]);

        }
      },
      error: err => {
        this.errorMessage = 'Nepodarilo sa načítať produkty';
        this.isLoading = false;
        console.error(err);
      }
    });
  }

  loadAllSuroviny() {
    this.productService.loadAllProduct().subscribe(products => {
      this.allSuroviny = products.filter(p => p.product_type_name?.toLowerCase() === 'surovina');
    });
  }

  handleRowClick(product: Product) {
    this.selectedProduct = product;
    this.loadIngredients(product.id);

  }

  loadIngredients(productId: number) {
    this.productIngredientsService.loadIngredients(productId).subscribe({
      next: res => {
        this.ingredients = res;
      },
      error: err => console.error('Chyba pri načítaní ingrediencií', err)
    });
  }

  availableIngredients(): Product[] {
    if (!this.allSuroviny) return [];

    return this.allSuroviny.filter(surovina => {
      if (this.selectedIngredient && surovina.id === this.selectedIngredient.ingredient_id) return true;
      return !this.ingredients.some(ing => ing.ingredient_id === surovina.id);
    });
  }
  updateIngredientQuantity(ingredient: ProductIngredient) {
    if (!ingredient.id) {
      console.error('Ingrediencia nemá ID v DB');
      return;
    }

    const ingredientData: Partial<ProductIngredient> = {
      quantity: ingredient.quantity
    };

    this.productIngredientsService.updateIngredient(ingredient.id, ingredientData)
      .subscribe({
        next: updatedIngredient => {
          console.log('Množstvo aktualizované:', updatedIngredient);
          // lokálna aktualizácia (voliteľná)
          const idx = this.ingredients.findIndex(i => i.id === updatedIngredient.id);
          if (idx !== -1) {
            this.ingredients[idx].quantity = updatedIngredient.quantity;
          }
        },
        error: err => console.error('Chyba pri aktualizácii množstva', err)
      });
  }

  deleteIngredient(ingredient: ProductIngredient) {
    if (!ingredient.id) return;

    this.productIngredientsService.deleteIngredient(ingredient.id).subscribe({
      next: () => {
        console.log('Ingrediencia vymazaná:', ingredient);

        // odstránime ingredienciu z lokálneho zoznamu
        this.ingredients = this.ingredients.filter(i => i.id !== ingredient.id);


      },
      error: err => console.error('Chyba pri vymazaní ingrediencie', err)
    });
  }


  //-----------------------
  //Modal window
  //-----------------------
  openModal() {
    this.showModal = true
  }
  closeModal() {
    this.showModal = false
  }

  onAddIngredient(event: AddIngredientEvent) {
    if (!this.selectedProduct) return;

    const payload = {
      product: this.selectedProduct.id,
      ingredient_id: event.ingredient.ingredient_id,
      quantity: event.quantity
    };

    this.productIngredientsService.createIngredientManufacture(payload).subscribe({
      next: savedIngredient => {
        this.ingredients.push(savedIngredient);
        this.closeModal();
      },
      error: err => console.error('Chyba pri ukladaní ingrediencie', err)
    });



    this.closeModal();
  }



}