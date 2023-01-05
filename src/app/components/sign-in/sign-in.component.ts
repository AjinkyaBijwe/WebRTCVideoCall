import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from "../../shared/services/auth.service";

@Component({
  selector: 'app-sign-in',
  templateUrl: './sign-in.component.html',
  styleUrls: ['./sign-in.component.scss']
})

export class SignInComponent implements OnInit {
  loginForm: any;

  constructor(public authService: AuthService, public router: Router) {}

  ngOnInit() {
    this.loginForm = {
      email: '',
      password: ''
    };
    this.backToPreviousPage();
  }

  backToPreviousPage() {
    const { redirect } = window.history.state;
    this.router.navigateByUrl(redirect || '/dashboard');
  }

}