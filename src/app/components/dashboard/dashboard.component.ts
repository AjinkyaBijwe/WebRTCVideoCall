import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { Router } from '@angular/router';
import { AuthService } from '../../shared/services/auth.service';
import { Peer, DataConnection, MediaConnection } from "peerjs";
import fscreen from 'fscreen';
import { SharedService } from 'src/app/shared/services/shared.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  showSidebar: boolean = true;
  isCollapsed: boolean = true;
  chatMessage: string = '';
  chatMessages: any = [];
  myNumber: number | undefined;
  callNumber: number | undefined;
  connectedCallNumber: number | undefined;
  callerNumber: string = '';
  callConnected: boolean = false;
  @ViewChild('localVideoStream', {
    static: true
  })
  localVideoStream!: ElementRef;
  @ViewChild('remoteVideoStream', {
    static: true
  })
  remoteVideoStream!: ElementRef;
  @ViewChild('fullScreen', {
    static: true
  })
  fullScreen!: ElementRef;
  peer!: Peer;
  activeDataConnection!: DataConnection;
  activeMediaConnection!: MediaConnection;
  receivingDataConnection!: DataConnection;
  receivingMediaConnection!: MediaConnection;
  hasFullscreenSupport: boolean = false;
  isFullscreen: any;
  incomingCall: boolean = false;
  myCallStream: any;
  callingAudio!: HTMLAudioElement;
  messageAudio: any;

  constructor(public authService: AuthService, public afAuth: AngularFireAuth, public router: Router, public sharedService: SharedService) {}

  ngOnInit() {
    this.hasFullscreenSupport = fscreen.fullscreenEnabled;
    if (this.hasFullscreenSupport) {
      fscreen.addEventListener('fullscreenchange', () => {
        this.isFullscreen = fscreen.fullscreenElement ? true : false;
      })
    }
    this.generateNumber();
    this.checkIncomingCall();
    this.loadSounds();
  }

  loadSounds() {
    this.callingAudio = new Audio();
    this.callingAudio.src = './assets/audio/calling.mp3';
    this.callingAudio.load();
    this.callingAudio.addEventListener('ended', () => {
      this.callingAudio.currentTime = 0;
      this.callingAudio.play();
    }, false);
    this.messageAudio = new Audio();
    this.messageAudio.src = './assets/audio/message.mp3';
    this.messageAudio.load();
  }

  checkIncomingCall() {
    this.peer.on('connection', (conn) => {
      this.receivingDataConnection = conn;
      conn.on('data', (data: any) => {
        data.class = 'received-message';
        data.sentMessage = false;
        this.chatMessages.unshift(data);
        this.messageAudio.play();
      });
      conn.on('close', () => {
        this.hangUpAfterEvent('Call Disconnected by User', false);
      })
      conn.on('error', () => {
        this.hangUpAfterEvent('Incoming Connection Error', true);
      })
    });
    this.peer.on('disconnected', () => {
      this.hangUpAfterEvent('Peer Disconnected', false);
    })
    this.peer.on('error', () => {
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
    this.myNumber = (Math.floor(Math.random() * 90000) + 10000);
    const myNumber = this.myNumber.toString();
    this.peer = new Peer(myNumber, {
      secure: true
    });
  }

  async callButton(requestCallNumber: any) {
    const callNumber = requestCallNumber.toString();
    this.activeDataConnection = this.peer.connect(callNumber);
    this.activeDataConnection.on('data', (data: any) => {
      data.class = 'received-message';
      data.sentMessage = false;
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
    try {
      const myStream: MediaStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      if (myStream) {
        this.myCallStream = myStream;
        this.localVideoStream.nativeElement.srcObject = myStream;
        this.activeMediaConnection = this.peer.call(callNumber, myStream);
        this.activeMediaConnection.on('stream', (remoteStream: any) => {
          this.remoteVideoStream.nativeElement.srcObject = remoteStream;
        });
        this.activeMediaConnection.on('close', () => {
          this.hangUpAfterEvent('Active Call Closed', false);
        });
        this.activeMediaConnection.on('error', () => {
          this.hangUpAfterEvent('Active Call Error', true);
        });
      }
    } catch (err) {
      this.hangUpAfterEvent('Failed to get local stream', true);
    }
  }

  async answerCall() {
    try {
      const answerStream: MediaStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      if (answerStream) {
        this.myCallStream = answerStream;
        this.callerNumber = this.receivingMediaConnection.peer;
        this.localVideoStream.nativeElement.srcObject = answerStream;
        this.receivingMediaConnection.answer(answerStream);
        this.receivingMediaConnection.on('stream', (remoteStream: any) => {
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
      }
    } catch (err) {
      this.hangUpAfterEvent('Failed to get Remote Stream', true);
    }
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
      const message = {
        text,
        user: user.displayName,
        number: this.myNumber,
        class: 'sent-message',
        sentMessage: true
      };
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
      this.sharedService.showAlert({
        class: 'error',
        title: message,
        iconClass: 'fa-solid fa-phone'
      });
    } else {
      this.sharedService.showAlert({
        class: 'info',
        title: message,
        iconClass: 'fa-solid fa-phone'
      });
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
      this.sharedService.showAlert({
        class: 'error',
        title: `Full Screen Not Supported. Please Try Disabling Adblocker or Other Extensions`,
        iconClass: 'fa-solid fa-phone'
      });
    }
  }
}