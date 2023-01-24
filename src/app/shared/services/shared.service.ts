import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class SharedService {
  toasts: any = [];

  constructor() { }

  public showAlert(option: any) {
    this.toasts.push({ ...option });
  }

  public hideAlert(toast: any) {
    this.toasts = this.toasts.filter((t: any) => t !== toast);
  }
}
