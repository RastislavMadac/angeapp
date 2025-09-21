import { Component, OnInit, Input } from '@angular/core';
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

@Component({
  selector: 'app-product-ingredient',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule,
    MasterLayoutComponent, GenericTableComponent, NavbarComponent
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
    private productService: ProductIngredientService,
    private productMainService: ProductService,
    private userService: UserService,
    private notify: NotificationService
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
    this.productService.loadAllProduct().subscribe({
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

  private loadAllSuroviny() {
    this.productMainService.loadAllProduct().subscribe(products => {
      this.allSuroviny = products.filter(p => p.product_type_name?.toLowerCase() === 'surovina');
    });
  }

  handleRowClick(product: Product) {
    this.selectedProduct = product;
    this.loadIngredients(product.id);
  }

  private loadIngredients(productId: number) {
    this.productService.loadIngredients(productId).subscribe({
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

  addIngredient() {
    if (!this.selectedProduct) return;

    const data = {
      product: this.selectedProduct.id,
      ingredient_id: this.ingredientForm.value.ingredient_id,
      quantity: this.ingredientForm.value.quantity
    };

    this.productService.createIngredientManufacture(data).subscribe({
      next: () => {
        this.ingredientForm.reset({ quantity: 1 });
        this.loadIngredients(this.selectedProduct!.id);
      },
      error: err => console.error('Chyba pri pridávaní ingrediencie', err)
    });
  }

  editIngredient(ing: ProductIngredient) {
    this.selectedIngredient = ing;
    this.ingredientForm.setValue({
      ingredient_id: ing.ingredient_id,
      quantity: ing.quantity
    });
  }

  removeIngredient(ing: ProductIngredient) {
    this.productService.deleteIngredient(ing.id).subscribe({
      next: () => this.loadIngredients(this.selectedProduct!.id),
      error: err => console.error('Chyba pri odstraňovaní ingrediencie', err)
    });
  }

  saveIngredient() {
    if (!this.selectedProduct) return;

    const data = {
      product: this.selectedProduct.id,
      ingredient_id: this.ingredientForm.value.ingredient_id,
      quantity: this.ingredientForm.value.quantity
    };

    if (this.selectedIngredient) {
      this.productService.updateIngredient(this.selectedIngredient.id, data).subscribe({
        next: () => {
          this.selectedIngredient = null;
          this.ingredientForm.reset({ quantity: 1 });
          this.loadIngredients(this.selectedProduct!.id);
        },
        error: err => console.error('Chyba pri ukladaní ingrediencie', err)
      });
    } else {
      this.addIngredient();
    }
  }

  cancelEdit() {
    this.selectedIngredient = null;
    this.ingredientForm.reset({ quantity: 1 });
  }

  onFilterChange(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.filterText = value.toLowerCase();
  }

  // Metóda vracajúca len vyfiltrované ingrediencie
  filteredIngredients(): Product[] {
    const filtered = this.availableIngredients();
    if (!this.filterText) return filtered;
    return filtered.filter(s => s.product_name.toLowerCase().includes(this.filterText));
  }
}
