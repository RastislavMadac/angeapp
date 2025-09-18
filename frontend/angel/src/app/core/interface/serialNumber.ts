export interface ProductSerialNumber {
    id: number;
    product: number;         // ID produktu (foreign key)
    serial_number: string;   // UID z NFC čipu
    created_at: string;      // ISO datetime (UTC)
    is_serialized?: boolean; // ← pridaj toto
}
