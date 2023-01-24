import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GlobalToastComponent } from './components/global-toast/global-toast.component';
import { NgbToastModule } from '@ng-bootstrap/ng-bootstrap';

@NgModule({
  declarations: [
    GlobalToastComponent
  ],
  imports: [
    CommonModule,
    NgbToastModule,
  ],
  exports: [
    GlobalToastComponent
  ]
})
export class SharedModule { }
