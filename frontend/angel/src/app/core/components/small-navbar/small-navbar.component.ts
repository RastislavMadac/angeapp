import { Component, Input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { SmallNavBarInterface } from '../../interface/smallnavbar.interface';
import { CommonModule } from '@angular/common';
@Component({
  selector: 'app-small-navbar',
  imports: [MatButtonModule, MatIconModule, MatToolbarModule, MatTooltipModule, CommonModule],
  templateUrl: './small-navbar.component.html',
  styleUrls: ['./small-navbar.component.css']
})
export class SmallNavbarComponent {
  @Input() menuItems: SmallNavBarInterface[] = [];


}
