import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { Router } from '@angular/router';
import { AuthService } from '../../shared/services/auth.service';
import { Peer, DataConnection, MediaConnection } from 'peerjs';
import fscreen from 'fscreen';
import { SharedService } from 'src/app/shared/services/shared.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
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
    static: true,
  })
  localVideoStream!: ElementRef;
  @ViewChild('remoteVideoStream', {
    static: true,
  })
  remoteVideoStream!: ElementRef;
  @ViewChild('fullScreen', {
    static: true,
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

  constructor(
    public authService: AuthService,
    public afAuth: AngularFireAuth,
    public router: Router,
    public sharedService: SharedService
  ) {}

  ngOnInit() {
    this.initializeFullscreenSupport();
    this.generateNumber();
    this.checkIncomingCall();
    this.loadSounds();
  }

  initializeFullscreenSupport() {
    this.hasFullscreenSupport = fscreen.fullscreenEnabled;
    if (this.hasFullscreenSupport) {
      fscreen.addEventListener('fullscreenchange', () => {
        this.isFullscreen = !!fscreen.fullscreenElement;
      });
    }
  }

  loadSounds() {
    this.callingAudio = this.createAudio('./assets/audio/calling.mp3', true);
    this.messageAudio = this.createAudio('./assets/audio/message.mp3', false);
  }

  createAudio(src: string, loop: boolean): HTMLAudioElement {
    const audio = new Audio();
    audio.src = src;
    audio.load();
    if (loop) {
      audio.addEventListener(
        'ended',
        () => {
          audio.currentTime = 0;
          audio.play();
        },
        false
      );
    }
    return audio;
  }

  checkIncomingCall() {
    this.peer.on('connection', (conn: DataConnection) => {
      this.handleDataConnection(conn);
    });

    this.peer.on('disconnected', () => {
      this.hangUpAfterEvent('Peer Disconnected', false);
    });

    this.peer.on('error', () => {
      this.hangUpAfterEvent('Number is Incorrect', true);
    });

    this.peer.on('call', (call: MediaConnection) => {
      this.handleIncomingCall(call);
    });
  }

  handleDataConnection(conn: DataConnection) {
    this.receivingDataConnection = conn;
    conn.on('data', (data: any) => {
      this.handleIncomingData(data);
    });
    conn.on('close', () => {
      this.hangUpAfterEvent('Call Disconnected by User', false);
    });
    conn.on('error', () => {
      this.hangUpAfterEvent('Incoming Connection Error', true);
    });
  }

  handleIncomingData(data: any) {
    data.class = 'received-message';
    data.sentMessage = false;
    this.chatMessages.unshift(data);
    this.messageAudio.play();
  }

  handleIncomingCall(call: MediaConnection) {
    this.receivingMediaConnection = call;
    this.incomingCall = true;
    this.callingAudio.play();
  }

  generateNumber() {
    this.myNumber = Math.floor(Math.random() * 90000) + 10000;
    this.peer = new Peer(this.myNumber.toString(), { secure: true });
  }

  async callButton(requestCallNumber: any) {
    const callNumber = requestCallNumber.toString();
    this.activeDataConnection = this.peer.connect(callNumber);
    this.setupDataConnectionHandlers(
      this.activeDataConnection,
      requestCallNumber
    );

    try {
      const myStream = await this.getUserMediaStream();
      if (myStream) {
        this.setupMediaConnection(callNumber, myStream);
      }
    } catch (err) {
      this.hangUpAfterEvent('Failed to get local stream', true);
    }
  }

  setupDataConnectionHandlers(conn: DataConnection, requestCallNumber: any) {
    conn.on('data', (data: any) => {
      this.handleIncomingData(data);
    });
    conn.on('open', () => {
      this.connectedCallNumber = requestCallNumber;
      this.callConnected = true;
    });
    conn.on('close', () => {
      this.hangUpAfterEvent('User Call Ended', false);
    });
    conn.on('error', () => {
      this.hangUpAfterEvent('Peer Connection Error', true);
    });
  }

  async getUserMediaStream(): Promise<MediaStream> {
    return await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });
  }

  setupMediaConnection(callNumber: string, myStream: MediaStream) {
    this.myCallStream = myStream;
    this.localVideoStream.nativeElement.srcObject = myStream;
    this.activeMediaConnection = this.peer.call(callNumber, myStream);
    this.setupMediaConnectionHandlers(this.activeMediaConnection);
  }

  setupMediaConnectionHandlers(conn: MediaConnection) {
    conn.on('stream', (remoteStream: any) => {
      this.remoteVideoStream.nativeElement.srcObject = remoteStream;
    });
    conn.on('close', () => {
      this.hangUpAfterEvent('Active Call Closed', false);
    });
    conn.on('error', () => {
      this.hangUpAfterEvent('Active Call Error', true);
    });
  }

  async answerCall() {
    try {
      const answerStream = await this.getUserMediaStream();
      if (answerStream) {
        this.setupAnswerCall(answerStream);
      }
    } catch (err) {
      this.hangUpAfterEvent('Failed to get Remote Stream', true);
    }
  }

  setupAnswerCall(answerStream: MediaStream) {
    this.myCallStream = answerStream;
    this.callerNumber = this.receivingMediaConnection.peer;
    this.localVideoStream.nativeElement.srcObject = answerStream;
    this.receivingMediaConnection.answer(answerStream);
    this.setupMediaConnectionHandlers(this.receivingMediaConnection);
    this.receivingMediaConnection.on('stream', (remoteStream: any) => {
      this.callingAudio.pause();
      this.incomingCall = false;
      this.callConnected = true;
      this.remoteVideoStream.nativeElement.srcObject = remoteStream;
    });
  }

  hangUp() {
    this.closeConnections();
    this.stopLocalStream();
    this.resetCallState();
  }

  closeConnections() {
    this.activeDataConnection?.close();
    this.activeMediaConnection?.close();
    this.receivingDataConnection?.close();
    this.receivingMediaConnection?.close();
  }

  stopLocalStream() {
    this.myCallStream?.getTracks()?.forEach((track: any) => track?.stop());
  }

  resetCallState() {
    this.localVideoStream.nativeElement.srcObject = null;
    this.remoteVideoStream.nativeElement.srcObject = null;
    this.incomingCall = false;
    this.callConnected = false;
  }

  sendMessage(text: string, user: any) {
    if (text?.length && user?.displayName?.length) {
      const message = this.createMessage(text, user.displayName);
      this.chatMessages.unshift(message);
      this.messageAudio.play();
      this.chatMessage = '';
      this.sendMessageToConnections(message);
    }
  }

  createMessage(text: string, displayName: string) {
    return {
      text,
      user: displayName,
      number: this.myNumber,
      class: 'sent-message',
      sentMessage: true,
    };
  }

  sendMessageToConnections(message: any) {
    if (this.callConnected) {
      this.activeDataConnection?.send(message);
      this.receivingDataConnection?.send(message);
    }
  }

  hangUpAfterEvent(message: string, error: boolean) {
    setTimeout(() => {
      this.hangUp();
    }, 500);
    this.sharedService.showAlert({
      class: error ? 'error' : 'info',
      title: message,
      iconClass: 'fa-solid fa-phone',
    });
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
        iconClass: 'fa-solid fa-phone',
      });
    }
  }
}
