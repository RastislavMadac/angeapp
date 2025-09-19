import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MasterLayoutComponent } from '../master-layout/master-layout.component';
import { NavbarComponent } from '../navbar/navbar.component';
import { ProductService } from '../../servicies/product.service';
import { FilterService } from '../../servicies/filter.service';
import { UserService } from '../../servicies/user.service';
import { ProductIngredientService } from '../../servicies/productIngredient.service';
import { Product } from '../../interface/product.interface';
import { ProductIngredient } from '../../interface/productIngredient';
import { NotificationService } from '../../servicies/notification.service';
import { TableColumn } from '../../interface/tablecolumnn.interface';
import { GenericTableComponent } from '../generic-table/generic-table.component';

@Component({
  selector: 'app-product-ingredient',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, MasterLayoutComponent, GenericTableComponent, NavbarComponent],
  templateUrl: './ingredient.component.html',
  styleUrls: ['./ingredient.component.css']
})
export class ProductIngredientComponent implements OnInit {

  isLoading = true;
  errorMessage = '';
  product: Product[] = [];
  selectedProduct: Product | null = null;
  productForm: FormGroup | null = null;

  constructor(
    private productService: ProductIngredientService,
    private userService: UserService,
    private fb: FormBuilder,
    private notify: NotificationService,
    private filterService: FilterService) { }


  ngOnInit(): void {

    this.loadProducts();   // toto je čisto na zoznam

  }


  private loadProducts() {
    if (!this.userService.isLoggedIn()) {
      this.errorMessage = 'Nie ste prihlásený';
      this.isLoading = false;
      return;
    }

    this.isLoading = true;
    this.productService.loadAllProduct().subscribe({
      next: product => {
        this.product = product.map(p => ({ ...p, is_serialized: Boolean(p.is_serialized) }));
        this.isLoading = false;
      },
      error: err => {
        this.errorMessage = 'Nepodarilo sa načítať produkty';
        this.isLoading = false;
        console.error(err);
      }
    });

  }

  columns: TableColumn[] = [
    { key: 'id', label: 'Kód', type: 'number' },
    { key: 'product_id', label: 'Kód produktu', type: 'number' },
    { key: 'internet_id', label: 'Internét kód', type: 'number' },
    { key: 'unit_name', label: 'Jednotka', type: 'text' },
    { key: 'product_type_name', label: 'Typ karty', type: 'text', },
    { key: 'is_serialized', label: 'Výrobná karta', type: 'boolean' },
    { key: 'product_name', label: 'Názov položky', type: 'text' },
    { key: 'description', label: 'Opis položky', type: 'text' },
    { key: 'weight_item', label: 'Hmotnosť položky', type: 'text' },
    { key: 'internet', label: 'Internet', type: 'boolean' },
    { key: 'ean_code', label: 'EAN kód', type: 'text' },
    { key: 'qr_code', label: 'QR kód', type: 'text' },
    { key: 'price_no_vat', label: 'Cena bez DPH', type: 'number' },
    { key: 'total_quantity', label: 'Celkové množstvo', type: 'number' },
    { key: 'reserved_quantity', label: 'Rezervované množstvo', type: 'number' },
    { key: 'free_quantity', label: 'Voľné množstvo', type: 'number' },
    { key: 'created_by', label: 'Vytvoril', type: 'number' },
    { key: 'created_at', label: 'Dátum vytvorenia', type: 'date' },
    { key: 'updated_at', label: 'Dátum úpravy', type: 'date' },
    { key: 'updated_by', label: 'Upravil', type: 'number' }
  ]


  handleRowClick(row: any) {
    this.selectedProduct = row;  // uchová vybraný produkt
    console.log('Vybraný produkt:', row);
  }

}

//   products: Product[] = [];
//   ingredients: ProductIngredient[] = [];
//   selectedIngredient: ProductIngredient | null = null;

//   ingredientForm!: FormGroup;

//   constructor(
//     private fb: FormBuilder,
//     private productService: ProductService,
//     private ingredientService: ProductIngredientService
//   ) { }

//   ngOnInit(): void {
//     // inicializácia formulára
//     this.ingredientForm = this.fb.group({
//       product: [null, Validators.required],
//       ingredient_id: [null, Validators.required],
//       quantity: [0, [Validators.required, Validators.min(0.001)]]
//     });

//     this.loadProducts();
//     this.loadIngredients();
//   }

//   // načítanie produktov
//   loadProducts(): void {
//     this.productService.loadAllProduct().subscribe(res => this.products = res);
//   }

//   // načítanie ingrediencií
//   loadIngredients(): void {
//     this.ingredientService.loadAllIngredients().subscribe(res => this.ingredients = res);
//   }
//   getProductName(productId: number): string {
//     const product = this.products.find(p => p.id === productId);
//     return product ? product.product_name : '';
//   }

//   // výber ingrediencie z tabuľky
//   selectIngredient(ingredient: ProductIngredient) {
//     this.selectedIngredient = ingredient;
//     this.ingredientForm.patchValue({
//       product: this.products.find(p => p.id === ingredient.product) || null,
//       ingredient_id: ingredient.ingredient_id,
//       quantity: ingredient.quantity
//     });
//   }

//   // uloženie alebo vytvorenie ingrediencie
//   saveIngredient() {
//     const formValue = this.ingredientForm.value;
//     const payload: Partial<ProductIngredient> = {
//       product: formValue.product.id,
//       ingredient_id: formValue.ingredient_id,
//       quantity: formValue.quantity
//     };

//     if (this.selectedIngredient) {
//       this.ingredientService.updateIngredient(this.selectedIngredient.id, payload)
//         .subscribe(() => {
//           this.loadIngredients();
//           this.selectedIngredient = null;
//           this.ingredientForm.reset();
//         });
//     } else {
//       this.ingredientService.createIngredient(payload)
//         .subscribe(() => {
//           this.loadIngredients();
//           this.ingredientForm.reset();
//         });
//     }
//   }

//   // odstránenie ingrediencie
//   deleteIngredient(id: number) {
//     this.ingredientService.deleteIngredient(id)
//       .subscribe(() => this.loadIngredients());
//   }
// }
