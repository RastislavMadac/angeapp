export interface SmallNavBarInterface {
    label: string;
    styleClass?: string; // trieda pre individuálne CSS
    click?: () => void;   // voliteľná funkcia pri kliknutí
}
