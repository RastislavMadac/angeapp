import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ItemcheckComponent } from './itemcheck.component';

describe('ItemcheckComponent', () => {
  let component: ItemcheckComponent;
  let fixture: ComponentFixture<ItemcheckComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ItemcheckComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ItemcheckComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
