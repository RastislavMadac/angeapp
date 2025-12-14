import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProductionCardPlansComponent } from './production-card-plans.component';

describe('ProductionCardPlansComponent', () => {
  let component: ProductionCardPlansComponent;
  let fixture: ComponentFixture<ProductionCardPlansComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProductionCardPlansComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProductionCardPlansComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
