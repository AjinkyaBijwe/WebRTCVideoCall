import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/auth';
import { Router } from '@angular/router';
import { AuthService } from '../../shared/services/auth.service';
import { environment } from 'src/environments/environment';
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
    callConnected: boolean = false;
    @ViewChild('localVideoStream', { static: true })
    localVideoStream: ElementRef;
    @ViewChild('remoteVideoStream', { static: true })
    remoteVideoStream: ElementRef;
    @ViewChild('fullScreen', { static: true })
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
    incomingCall: boolean;
    myCallStream: any;
    callingAudio: HTMLAudioElement;
    messageAudio: any;

	constructor(public authService: AuthService, public afAuth: AngularFireAuth, public router: Router) {}

	ngOnInit() {
        this.hasFullscreenSupport = fscreen.fullscreenEnabled;
        if (this.hasFullscreenSupport) {
            fscreen.addEventListener('fullscreenchange', () => {
                this.isFullscreen = fscreen.fullscreenElement ? true: false;
            })
        }
        this.generateNumber();
        this.checkincomingCall();
        this.loadSounds();
	}

    loadSounds() {
        this.callingAudio = new Audio();
        this.callingAudio.src = environment.production ? 'https://ajinkyabijwe.github.io/WebRTCVideoCall/assets/audio/calling.mp3' : '../../../assets/audio/calling.mp3';
        this.callingAudio.load();
        this.callingAudio.addEventListener('ended', () => {
            this.callingAudio.currentTime = 0;
            this.callingAudio.play();
        }, false);
        this.messageAudio = new Audio();
        this.messageAudio.src = environment.production ? 'https://ajinkyabijwe.github.io/WebRTCVideoCall/assets/audio/message.mp3' : '../../../assets/audio/message.mp3';
        this.messageAudio.load();
    }

    checkincomingCall() {
        this.peer.on('connection', (conn) => {
            this.receivingDataConnection = conn;
            conn.on('data', (data) => {
                data.class = 'received-message';
                this.chatMessages.unshift(data);
                this.messageAudio.play();
            });
            // conn.on('open', () => {})
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
        this.peer.on('call', (call) => {
            this.receivingMediaConnection = call;
            this.incomingCall = true;
            this.callingAudio.play();
        });
    }

    generateNumber() {
        this.myNumber = (Math.floor(Math.random()*90000) + 10000);
        const myNumber = this.myNumber.toString();
        this.peer = new Peer(myNumber, {
            secure: true,
            config: {
                iceServers: [{
                    urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'],
                }],
                iceCandidatePoolSize: 10,
            }
        });
    }

	callButton(requestCallNumber: any) {
        const callNumber = requestCallNumber.toString();
        this.errorMessage = '';
        this.infoMessage = '';
        this.activeDataConnection = this.peer.connect(callNumber);
        this.activeDataConnection.on('data', (data) => {
            data.class = 'received-message';
            this.chatMessages.unshift(data);
            this.messageAudio.play();
        });
        this.activeDataConnection.on('open', () => {
            this.connectedCallNumber = requestCallNumber;
            this.callConnected = true;
        });
        this.activeDataConnection.on('close', () => {
            this.hangUpAfterEvent('User Call Ended', false);
        });
        this.activeDataConnection.on('error', () => {
            this.hangUpAfterEvent('Peer Connection Error', true);
        });
        navigator.getUserMedia({video: true, audio: true}, (myStream: MediaStream) => {
            this.myCallStream = myStream;
            this.localVideoStream.nativeElement.srcObject = myStream;
            this.activeMediaConnection = this.peer.call(callNumber, myStream);
            this.activeMediaConnection.on('stream', (remoteStream) => {
                this.remoteVideoStream.nativeElement.srcObject = remoteStream;
            });
            this.activeMediaConnection.on('close', () => {
                this.hangUpAfterEvent('Active Call Closed', false);
            });
            this.activeMediaConnection.on('error', () => {
                this.hangUpAfterEvent('Active Call Error', true);
            });
        }, (err) => {
            this.hangUpAfterEvent('Failed to get local stream', true);
        });
	}

    answerCall() {
        navigator.getUserMedia({ video: true, audio: true }, (myStream: MediaStream) => {
            this.myCallStream = myStream;
            this.callerNumber = this.receivingMediaConnection.peer;
            this.localVideoStream.nativeElement.srcObject = myStream;
            this.receivingMediaConnection.answer(myStream);
            this.receivingMediaConnection.on('stream', (remoteStream) => {
                this.callingAudio.pause();
                this.incomingCall = false;
                this.callConnected = true;
                this.remoteVideoStream.nativeElement.srcObject = remoteStream;
            });
            this.receivingMediaConnection.on('close', () => {
                this.hangUpAfterEvent('Receiving Call Closed', false);
            })
            this.receivingMediaConnection.on('error', () => {
                this.incomingCall = false;
                this.hangUpAfterEvent('Receiving Call Error', true);
            })
        }, (err) => {
            this.hangUpAfterEvent('Failed to get Remote Stream', true);
        });
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
        if (this.myCallStream?.getTracks()?.length) {
            this.myCallStream.getTracks().forEach((track: any) => {
                track?.stop();
            });
        }
        this.localVideoStream.nativeElement.srcObject = null;
        this.remoteVideoStream.nativeElement.srcObject = null;
        this.incomingCall = false;
        this.callConnected = false;
    }

	sendMessage(text: string, user: any) {
		if (text?.length && user?.displayName?.length) {
            const message = { text, user: user.displayName, number: this.myNumber, class: 'sent-message' };
			this.chatMessages.unshift(message);
            this.messageAudio.play();
			this.chatMessage = '';
            if (this.callConnected && this.activeDataConnection) {
                this.activeDataConnection.send(message);
            }
            if (this.callConnected && this.receivingDataConnection) {
                this.receivingDataConnection.send(message);
            }
		}
	}

    hangUpAfterEvent(message: string, error: boolean) {
        setTimeout(() => {
            this.hangUp();
        }, 500);
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