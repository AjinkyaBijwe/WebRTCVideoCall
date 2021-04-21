import { Injectable } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/auth';
import firebase from 'firebase/app';
import { AngularFirestore, AngularFirestoreDocument } from '@angular/fire/firestore';
import { ActivatedRoute, Router } from "@angular/router";

@Injectable({
	providedIn: 'root'
})

export class AuthService {
	userData: any; // Save logged in user data

	constructor(public afs: AngularFirestore, public afAuth: AngularFireAuth, public router: Router, public route: ActivatedRoute) {}

	SignIn(email: any, password: any) {
		return this.afAuth.signInWithEmailAndPassword(email, password)
        .then((result: any) => {
            if (result.user && result.user.emailVerified) {
                this.SetUserData(result.user);
                this.router.navigate(['dashboard']);
            } else {
                this.router.navigate(['verify-email-address']);
            }
        }).catch((error: any) => {
            window.alert(error.message)
        })
	}

	SignUp(email: any, password: any) {
		return this.afAuth.createUserWithEmailAndPassword(email, password)
        .then((result: any) => {
            this.SendVerificationMail(result.user);
            this.SetUserData(result.user);
        }).catch((error: any) => {
            window.alert(error.message)
        })
	}

	SendVerificationMail(user: any) {
		return user.sendEmailVerification()
        .then(() => {
            this.router.navigate(['verify-email-address']);
        })
	}

	ForgotPassword(passwordResetEmail: any) {
		return this.afAuth.sendPasswordResetEmail(passwordResetEmail)
        .then(() => {
            window.alert('Password reset email sent, check your inbox.');
        }).catch((error: any) => {
            window.alert(error)
        })
	}

	get isLoggedIn(): boolean {
		let user: any = localStorage.getItem('user');
        if (user) {
            user = JSON.parse(user);
            this.userData = user;
        }
		return (user && user.emailVerified !== false) ? true : false;
	}

	GoogleAuth() {
		return this.AuthLogin(new firebase.auth.GoogleAuthProvider());
	}

	AuthLogin(provider: any) {
		return this.afAuth.signInWithPopup(provider)
        .then((result: any) => {
            this.SetUserData(result.user);
            this.router.navigate(['dashboard']);
        }).catch((error: any) => {
            window.alert(error)
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
        localStorage.setItem('user', JSON.stringify(userData));
        // const userRef: AngularFirestoreDocument < any > = this.afs.doc(`users/${user.uid}`);
		// return userRef.set(userData, {
		// 	merge: true
		// }) 
        // Uncomment If you want to store user in a document
	}

	SignOut() {
		this.afAuth.signOut().then(() => {
            this.userData = null;
			localStorage.removeItem('user');
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