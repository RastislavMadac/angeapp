import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProductPlanTableComponent } from './product-plan-table.component';

describe('ProductPlanTableComponent', () => {
  let component: ProductPlanTableComponent;
  let fixture: ComponentFixture<ProductPlanTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProductPlanTableComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProductPlanTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
