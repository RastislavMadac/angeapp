import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SerialNumberComponent } from './serial-number.component';

describe('SerialNumberComponent', () => {
  let component: SerialNumberComponent;
  let fixture: ComponentFixture<SerialNumberComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SerialNumberComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SerialNumberComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
