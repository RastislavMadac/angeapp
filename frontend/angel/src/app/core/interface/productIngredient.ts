export interface ProductIngredient {
    id: number;               // ID záznamu v databáze
    product: number;          // ID výrobku, ku ktorému patrí ingrediencia
    ingredient_id: number;    // ID suroviny (produkt typu 'surovina')
    ingredient_name: string;  // názov suroviny pre zobrazenie vo fronte
    quantity: string | number; // množstvo potrebné pre výrobok (napr. "2.500" alebo 2.5)
}
