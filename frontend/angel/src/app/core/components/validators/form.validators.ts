import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { NotificationService } from '../../servicies/notification.service';
import { environment } from '../../../../enviroment/enviroment';

/**
 * Validator, ktorý kontroluje celé číslo a zároveň volá NotifyService pri chybe
 * @param notify NotifyService na zobrazenie správy
 * @param message Voliteľná správa, ktorá sa zobrazí
 */


//#region function integerValidatorWithNotify
//ANCHOR - function integerValidatorWithNotify
export function integerValidatorWithNotify(notify: NotificationService, message: string = 'Hodnota musí byť celé číslo'): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
        const value = control.value;

        if (value == null || value === '') return null; // ignorujeme prázdne hodnoty

        if (!Number.isInteger(Number(value))) {
            // Volanie notifikácie live
            notify.showError(message);
            //STUB  'Hodnota musí byť celé číslo'
            if (!environment.production && environment.debug) { console.log('Hodnota musí byť celé číslo'); }

            // Vraciame aj error pre Angular FormControl
            return { notInteger: { message } };
        }


        return null; // validácia OK
    };
}
// #endregion


//#region function codeValidator
//ANCHOR - codeValidator
export function codeValidator(notify: NotificationService, message: string = 'Kód musí začínať na E a mať 4 znaky'): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
        const value = control.value;
        if (!value) return null; // ignorujeme prázdne, handled by required

        if (!/^E.{3}$/.test(value)) {
            notify.showError(message);
            //STUB  'Kód musí začínať na E a mať 4 znaky'
            if (!environment.production && environment.debug) { console.log('Kód musí začínať na E a mať 4 znaky'); }

            return { invalidCode: { message } };
        }

        return null;
    };
}

// #endregion
