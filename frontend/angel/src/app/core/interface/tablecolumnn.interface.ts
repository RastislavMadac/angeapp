export interface TableColumn {
    /** názov poľa v objekte (napr. "username" z User alebo "price" z Product) */
    key: string;

    /** text v hlavičke tabuľky (napr. "Používateľ" alebo "Cena") */
    label: string;

    /** voliteľný typ stĺpca – pomáha pri formátovaní */
    type?: 'text' | 'number' | 'date' | 'boolean' | "object-array";

    /** voliteľne – stĺpec môže byť zarovnaný */
    align?: 'left' | 'center' | 'right';

    /** voliteľne – šírka stĺpca (napr. "150px" alebo "20%") */
    width?: string;

    /** voliteľne – custom template pre špeciálne stĺpce (napr. tlačidlá) */
    template?: any;
    fullLabel?: string;

}
