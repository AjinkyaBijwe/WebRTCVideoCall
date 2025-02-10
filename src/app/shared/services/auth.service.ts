import { Injectable } from '@angular/core';
import { FirebaseApp, initializeApp } from 'firebase/app';
import {
  AppCheck,
  AppCheckTokenResult,
  getToken,
  initializeAppCheck,
  ReCaptchaV3Provider,
} from 'firebase/app-check';
import {
  Auth,
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithPopup,
  GoogleAuthProvider,
} from 'firebase/auth';
import { Firestore, getFirestore } from 'firebase/firestore';
import { ActivatedRoute, Router } from '@angular/router';
import { environment } from 'src/environments/environment';
import { SharedService } from './shared.service';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  app: FirebaseApp;
  appCheck: AppCheck;
  auth: Auth;
  firestore: Firestore;
  userData: any = {
    uid: null,
    email: null,
    displayName: null,
    photoURL: './assets/dummy-user.png',
    emailVerified: false,
  }; // Save logged in user data

  constructor(
    public router: Router,
    public route: ActivatedRoute,
    public sharedService: SharedService
  ) {
    this.app = initializeApp(environment.firebase);
    this.appCheck = initializeAppCheck(this.app, {
      provider: new ReCaptchaV3Provider(environment.captchaKey),
      isTokenAutoRefreshEnabled: true,
    });
    this.auth = getAuth(this.app);
    this.firestore = getFirestore(this.app);
  }

  async getToken(): Promise<AppCheckTokenResult | undefined> {
    let appCheckTokenResponse;
    try {
      appCheckTokenResponse = await getToken(this.appCheck);
    } catch (err) {
      return;
    }
    return appCheckTokenResponse;
  }

  checkToken() {
    return new Promise(async (resolve, reject) => {
      const token = await this.getToken();
      if (!token) {
        resolve(true);
      } else {
        resolve(token);
      }
    });
  }

  signIn(email: string, password: string) {
    this.checkToken()
      .then(() => {
        return signInWithEmailAndPassword(this.auth, email, password)
          .then((result) => {
            if (result.user && result.user.emailVerified) {
              this.SetUserData(result.user);
              this.router.navigate(['dashboard']);
            } else {
              this.router.navigate(['verify-email-address']);
            }
          })
          .catch((error) => {
            this.sharedService.showAlert({
              class: 'error',
              title: error.message,
              iconClass: 'fa-solid fa-phone',
            });
          });
      })
      .catch((error) => {
        console.error(error);
      });
  }

  signUp(email: string, password: string) {
    this.checkToken()
      .then(() => {
        return createUserWithEmailAndPassword(this.auth, email, password)
          .then((result) => {
            this.sendVerificationMail(result.user);
            this.SetUserData(result.user);
          })
          .catch((error) => {
            this.sharedService.showAlert({
              class: 'error',
              title: error.message,
              iconClass: 'fa-solid fa-phone',
            });
          });
      })
      .catch((error) => {
        console.error(error);
      });
  }

  sendVerificationMail(user: any) {
    this.checkToken()
      .then(() => {
        return sendEmailVerification(user).then(() => {
          this.router.navigate(['verify-email-address']);
        });
      })
      .catch((error) => {
        console.error(error);
      });
  }

  forgotPassword(passwordResetEmail: string) {
    this.checkToken()
      .then(() => {
        return sendPasswordResetEmail(this.auth, passwordResetEmail)
          .then(() => {
            this.sharedService.showAlert({
              class: 'info',
              title: 'Password reset email sent, check your inbox.',
              iconClass: 'fa-solid fa-phone',
            });
          })
          .catch((error) => {
            this.sharedService.showAlert({
              class: 'error',
              title: error.message,
              iconClass: 'fa-solid fa-phone',
            });
          });
      })
      .catch((error) => {
        this.sharedService.showAlert({
          class: 'error',
          title: error.message,
          iconClass: 'fa-solid fa-phone',
        });
      });
  }

  get isLoggedIn(): boolean {
    let user: any = localStorage.getItem('WebRTCVideoCallUser');
    if (user) {
      user = JSON.parse(user);
      this.userData = user;
    }
    return user && user.emailVerified !== false ? true : false;
  }

  GoogleAuth() {
    this.checkToken()
      .then(() => {
        return this.AuthLogin(new GoogleAuthProvider());
      })
      .catch((error) => {
        console.error(error);
      });
  }

  AuthLogin(provider: any) {
    return signInWithPopup(this.auth, provider)
      .then((result) => {
        this.SetUserData(result.user);
        this.router.navigate(['dashboard']);
      })
      .catch((error) => {
        this.sharedService.showAlert({
          class: 'error',
          title: error.message,
          iconClass: 'fa-solid fa-phone',
        });
      });
  }

  SetUserData(user: any) {
    const userData = {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName ? user.displayName : user.email,
      photoURL: user.photoURL,
      emailVerified: user.emailVerified,
    };
    localStorage.setItem('WebRTCVideoCallUser', JSON.stringify(userData));
  }

  SignOut() {
    this.auth.signOut().then(() => {
      this.userData = null;
      localStorage.removeItem('WebRTCVideoCallUser');
      this.router.navigate(['sign-in']);
    });
  }

  getValidationMessage(input: any) {
    input.validationMessage = null;
    if (input && input.errors && input.dirty) {
      if (input.errors.pattern || input.errors.email) {
        input.errors.validationMessage = `Invalid ${input.name}`;
      }
      if (input.errors.required) {
        input.errors.validationMessage = `required`;
      }
    }
  }
}
