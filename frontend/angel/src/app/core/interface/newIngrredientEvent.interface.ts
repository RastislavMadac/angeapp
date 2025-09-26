import { ProductIngredient } from "./productIngredient";

export interface AddIngredientEvent {
    ingredient: ProductIngredient; // samotná ingrediencia
    quantity: number;              // množstvo, ktoré sa má pridať
}
