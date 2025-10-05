import { Component, Input, Output, EventEmitter } from '@angular/core';
import { UserService } from '../../servicies/user.service';
import { Router } from '@angular/router';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FormsModule } from '@angular/forms';
import { FilterService } from '../../servicies/filter.service';
import { Observable } from 'rxjs';
import { ButtonsService } from '../../servicies/buttons.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterModule, CommonModule, MatButtonModule, MatIconModule, MatToolbarModule, MatTooltipModule, FormsModule],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css'],
})
export class NavbarComponent<T = any> {

  // ---------- UI / navigácia ----------
  @Input() selectedItem: T | null = null;
  @Output() deleteItem = new EventEmitter<T>();
  @Output() create = new EventEmitter<void>();
  @Output() edit = new EventEmitter<T>();

  logoUrl = '/assets/letter-a.png';

  constructor(
    private userService: UserService,
    private router: Router,
    private filterService: FilterService,
    private buttonService: ButtonsService
  ) {
    this.filters$ = this.filterService.filters$; // vyhľadávanie
  }



  // ---------- Vyhľadávanie/filtrovanie ----------
  filters$: Observable<string[]>;
  searchTerm = '';


  onDeleteClick() {
    this.buttonService.triggerDelete();
  }

  onSaveClick() {
    this.buttonService.triggerSave();
  }
  onAddClick() {
    this.buttonService.triggerAdd();
  }

  enterPressed() {
    const filter = this.searchTerm.trim();
    if (!filter) return;
    this.filterService.addFilter(filter);
    this.searchTerm = '';
  }

  removeFilterAt(index: number) {
    this.filterService.removeFilter(index);
  }

  clearFilterAt() {
    this.filterService.clearFilters();
  }

  // ---------- UI / navigácia ----------
  get user() {
    return this.userService.getUser();
  }

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
