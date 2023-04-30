import { Injectable } from '@angular/core';
import { FirebaseApp, initializeApp } from 'firebase/app';
import { AppCheck, AppCheckTokenResult, getToken, initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { GoogleAuthProvider } from 'firebase/auth';

import { ActivatedRoute, Router } from "@angular/router";
import { environment } from 'src/environments/environment';
import { SharedService } from './shared.service';

@Injectable({
  providedIn: 'root'
})

export class AuthService {
  app: FirebaseApp;
  appCheck: AppCheck;
  userData: any = {
    uid: null,
    email: null,
    displayName: null,
    photoURL: './assets/dummy-user.png',
    emailVerified: false
  }; // Save logged in user data

  constructor(public afs: AngularFirestore, public afAuth: AngularFireAuth, public router: Router, public route: ActivatedRoute,
    public sharedService: SharedService) {
    this.app = initializeApp(environment.firebase);
    this.appCheck = initializeAppCheck(this.app, {
      provider: new ReCaptchaV3Provider(environment.captchaKey),
      isTokenAutoRefreshEnabled: true
    });
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
        // reject('No Token Re-Captcha Failed');
        resolve(true);
      } else {
        resolve(token);
      }
    });
  }

  signIn(email: any, password: any) {
    this.checkToken().then(() => {
      return this.afAuth.signInWithEmailAndPassword(email, password)
      .then((result: any) => {
        if (result.user && result.user.emailVerified) {
          this.SetUserData(result.user);
          this.router.navigate(['dashboard']);
        } else {
          this.router.navigate(['verify-email-address']);
        }
      }).catch((error: any) => {
        this.sharedService.showAlert({
          class: 'error',
          title: error.message,
          iconClass: 'fa-solid fa-phone'
        });
      })
    }).catch((error: any) => {
      console.error(error);
    });
  }

  signUp(email: any, password: any) {
    this.checkToken().then(() => {
      return this.afAuth.createUserWithEmailAndPassword(email, password)
      .then((result: any) => {
        this.sendVerificationMail(result.user);
        this.SetUserData(result.user);
      }).catch((error: any) => {
        this.sharedService.showAlert({
          class: 'error',
          title: error.message,
          iconClass: 'fa-solid fa-phone'
        });
      })
    }).catch((error: any) => {
      console.error(error);
    });
  }

  sendVerificationMail(user: any) {
    this.checkToken().then(() => {
      return user.sendEmailVerification()
      .then(() => {
        this.router.navigate(['verify-email-address']);
      })
    }).catch((error: any) => {
      console.error(error);
    });
  }

  forgotPassword(passwordResetEmail: any) {
    this.checkToken().then(() => {
      return this.afAuth.sendPasswordResetEmail(passwordResetEmail)
      .then(() => {
        this.sharedService.showAlert({
          class: 'info',
          title: 'Password reset email sent, check your inbox.',
          iconClass: 'fa-solid fa-phone'
        });
      }).catch((error: any) => {
        this.sharedService.showAlert({
          class: 'error',
          title: error,
          iconClass: 'fa-solid fa-phone'
        });
      })
    }).catch((error: any) => {
      this.sharedService.showAlert({
        class: 'error',
        title: error,
        iconClass: 'fa-solid fa-phone'
      });
    });
  }

  get isLoggedIn(): boolean {
    let user: any = localStorage.getItem('WebRTCVideoCallUser');
    if (user) {
      user = JSON.parse(user);
      this.userData = user;
    }
    return (user && user.emailVerified !== false) ? true : false;
  }

  GoogleAuth() {
    this.checkToken().then(() => {
      return this.AuthLogin(new GoogleAuthProvider());
    }).catch((error: any) => {
      console.error(error);
    });
  }

  AuthLogin(provider: any) {
    return this.afAuth.signInWithPopup(provider)
      .then((result: any) => {
        this.SetUserData(result.user);
        this.router.navigate(['dashboard']);
      }).catch((error: any) => {
        this.sharedService.showAlert({
          class: 'error',
          title: error,
          iconClass: 'fa-solid fa-phone'
        });
      })
  }

  SetUserData(user: any) {
    const userData = {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName ? user.displayName : user.email,
      photoURL: user.photoURL,
      emailVerified: user.emailVerified
    }
    localStorage.setItem('WebRTCVideoCallUser', JSON.stringify(userData));
    // const userRef: AngularFirestoreDocument < any > = this.afs.doc(`users/${user.uid}`);
    // return userRef.set(userData, {
    // 	merge: true
    // }) 
    // Uncomment If you want to store user in a document
  }

  SignOut() {
    this.afAuth.signOut().then(() => {
      this.userData = null;
      localStorage.removeItem('WebRTCVideoCallUser');
      this.router.navigate(['sign-in']);
    })
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