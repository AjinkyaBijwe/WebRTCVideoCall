import { Component, OnInit } from '@angular/core';
import { AuthService } from "../../shared/services/auth.service";

@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.scss']
})

export class ForgotPasswordComponent implements OnInit {
  resetPasswordForm: any;

  constructor(public authService: AuthService) {}

  ngOnInit() {
    this.resetPasswordForm = {
      email: ''
    }
  }

}