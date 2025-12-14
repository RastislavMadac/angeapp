import { Component, inject, OnInit } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators, FormBuilder, FormArray, } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { NotificationService } from '../../servicies/notification.service';
import { RouterModule } from '@angular/router';
import { NotificationCenterComponent } from '../notification-center/notification-center.component';

@Component({
  selector: 'app-test',
  imports: [CommonModule, ReactiveFormsModule, RouterModule, NotificationCenterComponent              // 
  ],
  standalone: true,
  templateUrl: './test.component.html',
  styleUrl: './test.component.css'
})
export class TestComponent implements OnInit {

  constructor(private notifyService: NotificationService) { }

  // --- TESTOVACIE METÓDY ---
  testSuccess() {
    this.notifyService.success('Údaje boli úspešne uložené! ✅');
  }

  testInfo() {
    this.notifyService.info('Nová verzia aplikácie je dostupná.');
  }

  testWarn() {
    this.notifyService.warn('Pozor, blíži sa koniec platnosti relácie.');
  }

  testError() {
    this.notifyService.error('Chyba pri pripájaní k serveru (500).');
  }

  testConfirm() {
    this.notifyService.confirm('Naozaj chceš vymazať tento záznam? Táto akcia je nevratná.')
      .then(result => {
        if (result) {
          this.notifyService.success('Záznam vymazaný.');
        } else {
          this.notifyService.info('Akcia zrušená.');
        }
      });
  }





  name = new FormControl('');

  updateName() { this.name.setValue('Nancy'); }


  profileForm = new FormGroup({
    firstName: new FormControl('', Validators.required),
    lastName: new FormControl('', Validators.required)
  });
  get firstName() {
    return this.profileForm.get('firstName');
  }
  ngOnInit(): void {
    // Sledujme celé hodnoty formulára
    this.profileForm.valueChanges.subscribe(value => {
      console.log('Form value:', value);
    });

    // Sledujme vlastnosti konkrétneho FormControl
    const firstNameControl = this.profileForm.get('firstName');

    firstNameControl?.valueChanges.subscribe(val => {
      console.log('--- First Name Control ---');
      console.log('Value:', val);
      console.log('Valid:', firstNameControl.valid);
      console.log('Invalid:', firstNameControl.invalid);
      console.log('Touched:', firstNameControl.touched);
      console.log('Dirty:', firstNameControl.dirty);
      console.log('Errors:', firstNameControl.errors);
    });
  }

  fillform() {
    this.profileForm.setValue({
      firstName: 'Peter',
      lastName: 'Novák'
    });
  }

  onSubmit() {

    this.profileForm.setValue({
      firstName: '',
      lastName: ''
    });
  }


  profileForm1 = new FormGroup({
    firstName: new FormControl(''),
    lastName: new FormControl(''),
    address: new FormGroup({
      street: new FormControl(''),
      city: new FormControl(''),
      state: new FormControl(''),
      zip: new FormControl(''),
    }),
  });

  updateProfile() {
    this.profileForm1.patchValue({
      firstName: 'Nancy',
      address: {
        street: '123 Drew Street',
      },
    });
  }




  private formBuilder = inject(FormBuilder);

  profileForm2 = this.formBuilder.group({
    firstName: ['', Validators.required],
    lastName: [''],
    address: this.formBuilder.group({
      street: [''],
      city: [''],
      state: [''],
      zip: [''],
    }),

  });


  profileForm3 = new FormGroup({
    firstName: new FormBuilder().control(''),
    lastName: new FormBuilder().control(''),
    phones: new FormArray([]) // tu budú dynamicky pridávané čísla
  });

  // getter pre jednoduchší prístup
  get phones(): FormArray {
    return this.profileForm3.get('phones') as FormArray;
  }

  // pridanie nového telefónu
  addPhone() {
    this.phones.push(this.formBuilder.control('', Validators.required));
  }

  // odstránenie telefónu podľa indexu
  removePhone(index: number) {
    this.phones.removeAt(index);
    console.log("index phone", index);
  }

  onSubmit1() {
    console.log(this.profileForm.value);
  }
}
