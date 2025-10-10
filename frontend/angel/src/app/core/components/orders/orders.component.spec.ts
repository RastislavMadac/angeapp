import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OrdersComponent } from './orders.component';
import { OrderService } from '../../servicies/order.service';
import { UserService } from '../../servicies/user.service';
import { NotificationService } from '../../servicies/notification.service';
import { ButtonsService } from '../../servicies/buttons.service';
import { of } from 'rxjs';
import { OrderInterface } from '../../interface/order.interface';

describe('OrdersComponent', () => {
  let component: OrdersComponent;
  let fixture: ComponentFixture<OrdersComponent>;
  let orderServiceSpy: jasmine.SpyObj<OrderService>;
  let userServiceSpy: jasmine.SpyObj<UserService>;
  let notifySpy: jasmine.SpyObj<NotificationService>;
  let buttonService: ButtonsService;

  const mockOrder: OrderInterface = {
    id: 1,
    order_number: 'ORD001',
    customer_id: 123,
    customer: 'Test',
    status: 'pending',
    total_price: 100,
    items: []
  };

  beforeEach(async () => {
    orderServiceSpy = jasmine.createSpyObj('OrderService', [
      'loadAllOrders',
      'createOrder',
      'updateOrder',
      'deleteOrder',
      'getOrder'
    ]);
    userServiceSpy = jasmine.createSpyObj('UserService', ['isLoggedIn']);
    notifySpy = jasmine.createSpyObj('NotificationService', ['notify', 'confirm']);

    await TestBed.configureTestingModule({
      imports: [OrdersComponent],
      providers: [
        { provide: OrderService, useValue: orderServiceSpy },
        { provide: UserService, useValue: userServiceSpy },
        { provide: NotificationService, useValue: notifySpy },
        ButtonsService
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(OrdersComponent);
    component = fixture.componentInstance;

    // default mocky
    userServiceSpy.isLoggedIn.and.returnValue(true);
    orderServiceSpy.loadAllOrders.and.returnValue(of([]));
    orderServiceSpy.updateOrder.and.returnValue(of(mockOrder));
    orderServiceSpy.createOrder.and.returnValue(of(mockOrder));
  });

  it('should create component', () => {
    expect(component).toBeTruthy();
  });

  it('should call updateOrder when saving existing order', () => {
    component.orderForm = component['fb'].group({
      order_number: ['ORD001'],
      customer: ['Test'],
      total_price: [100],
      status: ['pending']
    });

    component.selectedOrder = mockOrder;

    component.saveOrder();

    expect(orderServiceSpy.updateOrder).toHaveBeenCalledWith(mockOrder.id!, jasmine.any(Object));

  });

  it('should call createOrder when no selectedOrder exists', () => {
    component.orderForm = component['fb'].group({
      order_number: ['ORD002'],
      customer: ['New Customer'],
      total_price: [200],
      status: ['pending']
    });

    component.selectedOrder = null;

    component.saveOrder();

    expect(orderServiceSpy.createOrder).toHaveBeenCalledWith(jasmine.any(Object));
  });
});
