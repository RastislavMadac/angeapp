import {
  Component, OnInit, ChangeDetectorRef
} from '@angular/core';
import { UserService } from '../../servicies/user.service';
import { FilterService } from '../../servicies/filter.service';
import { User } from '../../interface/user.interface';
import { CommonModule } from '@angular/common';
import { TableColumn } from '../../interface/tablecolumnn.interface';
import { GenericTableComponent } from '../generic-table/generic-table.component';
import { MasterLayoutComponent } from '../master-layout/master-layout.component';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NotificationService } from '../../servicies/notification.service';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NavbarComponent } from '../navbar/navbar.component';
import { combineLatest, map, BehaviorSubject, Observable } from 'rxjs';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, GenericTableComponent, MasterLayoutComponent, ReactiveFormsModule, MatButtonModule, MatIconModule, MatTooltipModule, MatToolbarModule, NavbarComponent],
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.css']
})
export class UsersComponent implements OnInit {
  isLoading = true;
  errorMessage = '';
  users: User[] = [];
  selectedUser: User | null = null;   // klasická property
  userForm: FormGroup | null = null;  // klasická property
  filteredData$: Observable<User[]>;

  private filterSubject = new BehaviorSubject<User[]>([]); // reaktívny zdroj pre users


  columns: TableColumn[] = [
    { key: 'first_name', label: 'Krstné meno', type: 'text' },
    { key: 'last_name', label: 'Priezvisko', type: 'text' },
    { key: 'username', label: 'Používateľ', type: 'text' },
    { key: 'email', label: 'E-mail', type: 'text' },
    { key: 'role', label: 'Rola', type: 'text' },
    { key: 'is_active', label: 'Aktívny', type: 'boolean', align: 'center' },
    { key: 'created_at', label: 'Vytvorený', type: 'date' }
  ];



  constructor(
    private userService: UserService,
    private fb: FormBuilder,
    private notify: NotificationService,
    private filterService: FilterService,
    private cdr: ChangeDetectorRef) {

    // Observable pre filtrovaných používateľov
    this.filteredData$ = combineLatest([
      this.filterSubject.asObservable(),
      this.filterService.filters$
    ]).pipe(
      map(([users, filters]) => {
        if (!filters.length) return users;
        return users.filter(user =>
          filters.every(f =>
            Object.values(user).some(v =>
              v != null && v.toString().toLowerCase().includes(f)
            )
          )
        );
      })
    );
  }


  ngOnInit(): void {
    this.loadUsers();
  }




  private loadUsers() {
    if (!this.userService.isLoggedIn()) {
      this.errorMessage = 'Nie ste prihlásený';
      this.isLoading = false;
      return;
    }

    this.isLoading = true;
    this.userService.loadAllUsers().subscribe({
      next: users => {
        this.users = users.map(u => ({ ...u, is_active: Boolean(u.is_active) }));
        this.isLoading = false;
        this.filterSubject.next(this.users);
      },
      error: err => {
        this.errorMessage = 'Nepodarilo sa načítať používateľov';
        this.isLoading = false;
        console.error(err);
      }
    });
  }


  // keď chceš vytvoriť nového používateľa
  createNewUser() {
    this.selectedUser = null;
    this.initForm();
  }

  onDeleteUser(user: User) {
    // Odstráni zoznam
    this.users = this.users.filter(u => u.id !== user.id);
    this.selectedUser = null; // zruší výber
  }


  // inicializácia formulára pre edit alebo create
  initForm(user?: User) {
    this.userForm = this.fb.group({
      username: [user?.username || '', Validators.required],
      email: [user?.email || '', [Validators.required, Validators.email]],
      first_name: [user?.first_name || ''],
      last_name: [user?.last_name || ''],
      password: [user ? '' : '', user ? [] : Validators.required], // povinné len pri create
      role: [user?.role || 'worker', Validators.required],
      is_active: [user?.is_active ?? true]
    });
  }



  // ukladanie (edit alebo create)

  async selectUser(user: User) {
    if (this.userForm?.dirty) {
      const ok = await this.notify.confirm('Máte neuložené zmeny. Chcete ich uložiť?');

      if (ok) {
        await this.saveUser(); // uloženie
      } else {
        this.notify.notify('Neuložené zmeny boli zahodené', 'warn'); // warning
        this.userForm.reset(user); // reset na nový user
      }

    }

    this.selectedUser = user;
    this.initForm(user);
    this.cdr.detectChanges();// <--- PRIDAŤ ChangeDetectorRef
  }


  saveUser() {
    if (!this.userForm || this.userForm.invalid) return;

    if (this.selectedUser) {
      // update (PATCH) – posielame len upravené polia
      const payload: Partial<User> = {};

      // príklad: posielať len polia, ktoré sa menia
      if (this.userForm.value.email) payload.email = this.userForm.value.email;
      if (this.userForm.value.is_active !== undefined) payload.is_active = this.userForm.value.is_active;
      if (this.userForm.value.username !== undefined) payload.username = this.userForm.value.username;
      // pridaj ďalšie polia, ktoré sa môžu meniť
      if (this.userForm.value.first_name !== undefined) payload.first_name = this.userForm.value.first_name;
      if (this.userForm.value.last_name !== undefined) payload.last_name = this.userForm.value.last_name;
      // pridaj ďalšie polia, ktoré sa môžu meniť
      if (this.userForm.value.last_name !== undefined) payload.username = this.userForm.value.username;
      // pridaj ďalšie polia, ktoré sa môžu meniť

      this.userService.updateUser(this.selectedUser.id, payload).subscribe({
        next: res => {
          this.loadUsers();
          this.notify.notify('Používateľ bol uložený', 'info');
          this.userForm?.markAsPristine();
        },
        error: err => console.error(err)
      });
    } else {
      // create (POST) – posielame všetky polia z formulára
      const payload = { ...this.userForm.value };

      this.userService.createUser(payload).subscribe({
        next: res => {
          this.loadUsers();
          this.notify.notify('Používateľ bol vytvorený', 'info');
          this.userForm?.markAsPristine();
        },
        error: err => console.error(err)
      });
    }
  }




  addUser() {
    if (!this.userForm || this.userForm.invalid) return;

    const newUser = { ...this.userForm.value };

    this.userService.createUser(newUser).subscribe({
      next: res => {
        console.log('User created:', res);
        this.loadUsers(); // načítať aktualizovaný zoznam
      },
      error: err => console.error('Chyba pri vytváraní používateľa:', err)
    });
  }

  deleteUser(user: User | null) {
    if (!user) return; // nič neurobíme, ak je null
    if (!confirm(`Naozaj chcete zmazať používateľa ${user.username}?`)) return;

    this.userService.deleteUser(user.id).subscribe({
      next: () => {
        this.loadUsers();
        if (this.selectedUser?.id === user.id) this.selectedUser = null;
        console.log('Používateľ zmazaný');

        // Vyčistíme detail
        this.selectedUser = null;
        this.userForm = null;

      },
      error: err => console.error('Chyba pri mazání používateľa', err)
    });
  }


}
