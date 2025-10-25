import { Component } from '@angular/core';
import { MasterLayoutComponent } from '../master-layout/master-layout.component';
import { GenericTableComponent } from '../generic-table/generic-table.component';


@Component({
  selector: 'app-product-plan-table',
  standalone: true,
  imports: [MasterLayoutComponent, GenericTableComponent],
  templateUrl: './product-plan-table.component.html',
  styleUrls: ['./product-plan-table.component.css']
})
export class ProductPlanTableComponent {

}
