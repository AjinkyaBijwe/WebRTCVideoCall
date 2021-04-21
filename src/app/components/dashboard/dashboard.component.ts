import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/auth';
import { Router } from '@angular/router';
import { AuthService } from "../../shared/services/auth.service";
import Peer from 'peerjs';
import fscreen from 'fscreen';

@Component({
	selector: 'app-dashboard',
	templateUrl: './dashboard.component.html',
	styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
	showSidebar: boolean = true;
	isCollapsed: boolean = true;
	chatMessage: string = '';
	chatMessages: any = [];
    myNumber:  number;
    callNumber: number;
    connectedCallNumber: number;
    callerNumber: string = '';
    peerConnected: boolean = false;
    @ViewChild('localStream', { static: false })
    localStream: ElementRef;
    @ViewChild('remoteStream', { static: false })
    remoteStream: ElementRef;
    @ViewChild('fullScreen', { static: false })
    fullScreen: ElementRef;
    peer: Peer;
    errorMessage: string = '';
    errorTimeout: any;
    infoMessage: string = '';
    activeDataConnection: Peer.DataConnection;
    activeMediaConnection: Peer.MediaConnection;
    receivingDataConnection: Peer.DataConnection;
    receivingMediaConnection: Peer.MediaConnection;
    infoTimeout: any;
    hasFullscreenSupport: boolean;
    isFullscreen: any;

	constructor(public authService: AuthService, public afAuth: AngularFireAuth, public router: Router) {}

	ngOnInit() {
        this.hasFullscreenSupport = fscreen.fullscreenEnabled;
        if (this.hasFullscreenSupport) {
            fscreen.addEventListener('fullscreenchange', () => {
                this.isFullscreen = fscreen.fullscreenElement ? true: false;
            })
        }
        this.generateNumber();
        this.checkIncomingCall()
	}

    checkIncomingCall() {
        this.peer.on('connection', (conn) => {
            this.receivingDataConnection = conn;
            conn.on('data', (data) => {
                this.chatMessages.unshift(data);
            });
            conn.on('open', () => {
                this.peerConnected = true;
            })
            conn.on('close', ()=> {
                this.hangUpAfterEvent('Call Disconnected by User', false);
            })
            conn.on('error', ()=> {
                this.hangUpAfterEvent('Incoming Connection Error', true);
            })
        });
        this.peer.on('disconnected', ()=> {
            this.hangUpAfterEvent('Peer Disconnected', false);
        })
        this.peer.on('error', ()=> {
            this.hangUpAfterEvent('Number is Incorrect', true);
        })

        // Call User Listen
        const getUserMedia = navigator.getUserMedia;
        this.peer.on('call', (call) => {
            this.receivingMediaConnection = call;
        	getUserMedia({ video: true, audio: true }, (stream) => {
                this.callerNumber = call.peer;
        		call.answer(stream);
        		call.on('stream', (remoteStream) => {
                    this.localStream.nativeElement.srcObject = stream;
        			this.remoteStream.nativeElement.srcObject = remoteStream;
        		});
                call.on('close', () => {
                    this.hangUpAfterEvent('Receiving Call Closed', false);
                })
                call.on('error', () => {
                    this.hangUpAfterEvent('Receiving Call Error', true);
                })
        	}, (err) => {
                this.hangUpAfterEvent('Failed to get Remote Stream', true);
        	});
        });
    }

    generateNumber() {
        this.myNumber = (Math.floor(Math.random()*90000) + 10000);
        const myNumber = this.myNumber.toString();
        this.peer = new Peer(myNumber);
    }

	callButton(requestCallNumber: any) {
        const callNumber = requestCallNumber.toString();
        this.errorMessage = '';
        this.infoMessage = '';
        this.activeDataConnection = this.peer.connect(callNumber);
        this.activeDataConnection.on('data', (data) => {
            this.chatMessages.unshift(data);
        });
        this.activeDataConnection.on('open', () => {
            this.peerConnected = true;
            this.connectedCallNumber = requestCallNumber;
        });
        this.activeDataConnection.on('close', () => {
            this.hangUpAfterEvent('User Call Ended', false);
        });
        this.activeDataConnection.on('error', () => {
            this.hangUpAfterEvent('Peer Connection Error', true);
        });
        navigator.getUserMedia({video: true, audio: true}, (stream) => {
            this.activeMediaConnection = this.peer.call(callNumber, stream);
                this.activeMediaConnection.on('stream', (remoteStream) => {
                    this.localStream.nativeElement.srcObject = stream;
                    this.remoteStream.nativeElement.srcObject = remoteStream;
                });
                this.activeMediaConnection.on('close', () => {
                    this.hangUpAfterEvent('Active Call Closed', false);
                })
                this.activeMediaConnection.on('error', () => {
                    this.hangUpAfterEvent('Active Call Error', true);
                })
            }, (err) => {
                this.hangUpAfterEvent('Failed to get local stream', true);
            }
        );
	}

    hangUp() {
        if (this.activeDataConnection) {
            this.activeDataConnection.close();
        }
        if (this.activeMediaConnection) {
            this.activeMediaConnection.close();
        }
        if (this.receivingDataConnection) {
            this.receivingDataConnection.close();
        }
        if (this.receivingMediaConnection) {
            this.receivingMediaConnection.close();
        }
        this.peerConnected = false;
        this.localStream.nativeElement.srcObject = null;
        this.remoteStream.nativeElement.srcObject = null;
    }

	sendMessage(text: string, user: any) {
		if (text?.length && user?.displayName?.length) {
            const message = { text, user: user.displayName, number: this.myNumber };
			this.chatMessages.unshift(message);
			this.chatMessage = '';
            if (this.peerConnected && this.activeDataConnection) {
                this.activeDataConnection.send(message);
            }
            if (this.peerConnected && this.receivingDataConnection) {
                this.receivingDataConnection.send(message);
            }
		}
	}

    hangUpAfterEvent(message: string, error: boolean) {
        this.hangUp();
        if (error) {
            this.errorMessage = message;
            if (this.errorTimeout) {
                clearTimeout(this.errorTimeout);
            }
            this.errorTimeout = setTimeout(() => {
                this.errorMessage = ''
            }, 5000);
        } else {
            this.infoMessage = message;
            if (this.infoTimeout) {
                clearTimeout(this.errorTimeout);
            }
            this.infoTimeout = setTimeout(() => {
                this.infoMessage = ''
            }, 5000);
        }
    }

    signOut() {
        this.hangUp();
        setTimeout(() => {
            this.authService.SignOut();
        }, 1000);
    }

    openFullscreen() {
        if (this.hasFullscreenSupport) {
            const elem = this.fullScreen.nativeElement;
            if (!this.isFullscreen) {
                fscreen.requestFullscreen(elem);
            } else {
                fscreen.exitFullscreen(elem);
            }
        } else {
            this.errorMessage = 'Full Screen Not Supported. Please Try Disabling Adblocker or Other Extensions';
            if (this.errorTimeout) {
                clearTimeout(this.errorTimeout);
            }
            this.errorTimeout = setTimeout(() => {
                this.errorMessage = ''
            }, 5000);
        }
    }
}