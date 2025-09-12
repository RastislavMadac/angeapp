import { Component, Input, EventEmitter, Output } from '@angular/core';
import { UserService } from '../../servicies/user.service';
import { Router } from '@angular/router';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterModule, CommonModule, MatButtonModule, MatIconModule, MatToolbarModule, MatTooltipModule, FormsModule],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css'],
})



export class NavbarComponent<T = any> {
  @Input() selectedItem: T | null = null;
  @Input() showEdit = true;
  @Input() activeFilters: string[] = [];
  logoUrl = 'letter-a.png';
  @Output() enter = new EventEmitter<string>();
  @Output() create = new EventEmitter<void>();
  @Output() delete = new EventEmitter<T>();
  @Output() edit = new EventEmitter<T>();
  @Output() addFilterEvent = new EventEmitter<string>();
  @Output() removeFilterEvent = new EventEmitter<number>();
  @Output() clearFiltersEvent = new EventEmitter<void>();

  onCreate() { this.create.emit(); }
  onDelete() { if (this.selectedItem) this.delete.emit(this.selectedItem); }
  onEdit() { if (this.selectedItem) this.edit.emit(this.selectedItem); }
  searchTerm = '';


  constructor(private userService: UserService, private router: Router) { }


  // vyhladavanie
  enterPressed() {
    const filter = this.searchTerm.trim();
    if (!filter) return;

    // posielame von cez EventEmitter
    this.enter.emit(filter);

    this.searchTerm = '';
  }

  applyFilters() {
    throw new Error('Method not implemented.');
  }
  normalizeText(searchTerm: string): string {
    throw new Error('Method not implemented.');
  }


  get user() {
    return this.userService.getUser()
  }
  // getter sprístupní iba to, čo šablóna potrebuje
  get isAdmin(): boolean {
    return this.userService.isAdmin();
  }

  navigateTo(route: string) {
    this.router.navigate([route]);
  }

  logout() {
    this.userService.logout();
    this.router.navigate(['/login']);
  }
}
