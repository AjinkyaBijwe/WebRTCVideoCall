import { Component, OnInit } from '@angular/core';
import { AuthService } from "../../shared/services/auth.service";

@Component({
  selector: 'app-sign-up',
  templateUrl: './sign-up.component.html',
  styleUrls: ['./sign-up.component.scss']
})

export class SignUpComponent implements OnInit {
  registerForm: any;

  constructor(public authService: AuthService) {}

  ngOnInit() {
    this.registerForm = {
      email: '',
      password: ''
    };
  }

}