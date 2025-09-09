export interface User {
    id: number;
    first_name: string;
    last_name: string;
    username: string;
    email?: string;
    role?: string;
    is_active?: boolean;

}