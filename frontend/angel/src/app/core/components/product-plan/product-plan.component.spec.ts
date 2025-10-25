import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProductPlanComponent } from './product-plan.component';

describe('ProductPlanComponent', () => {
  let component: ProductPlanComponent;
  let fixture: ComponentFixture<ProductPlanComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProductPlanComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProductPlanComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
