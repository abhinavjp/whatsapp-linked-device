import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ConnectionService } from './services/connection.service';
import { QRCodeComponent } from 'angularx-qrcode';
import { Subscription } from 'rxjs';

/**
 * Message entry in the local history list.
 */
interface SentMessage {
  id: number;
  to: string;
  text: string;
  status: 'Sending...' | 'Sent ✅' | 'Failed ❌';
  error?: string;
  timestamp: string;
}

/**
 * Root component of the Angular application.
 * Manages the UI state and interactions for the WhatsApp Linked Device feature.
 */
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, QRCodeComponent, FormsModule],
  templateUrl: './app.html',
  styleUrls: ['./app.css']
})
export class AppComponent implements OnInit, OnDestroy {
  /** Indicates if the WhatsApp session is connected */
  isConnected = false;
  
  /** The current QR code string received from Baileys */
  qrData: string | null = null;
  
  /** Activity logs to display in the UI */
  logs: string[] = [];

  // Notification Form State
  phoneNumber = '';
  messageText = '';
  isSending = false;
  
  // History State
  messageHistory: SentMessage[] = [];
  
  private subs = new Subscription();

  constructor(private connectionService: ConnectionService, private cdr: ChangeDetectorRef) {}

  /**
   * Initializes the component and sets up subscriptions.
   */
  ngOnInit() {
    this.subs.add(
      this.connectionService.isConnected$.subscribe(status => {
        this.isConnected = status;
        if (status) {
          this.log('WhatsApp connection is active.');
        } else {
          this.log('WhatsApp disconnected.');
          this.qrData = null;
        }
      })
    );

    this.subs.add(
      this.connectionService.messages$.subscribe(msg => {
        if (msg.type === 'status') {
          this.log(`Node.js Status: ${msg.data}`);
        }
      })
    );

    this.subs.add(
      this.connectionService.qr$.subscribe(qrString => {
        this.qrData = qrString;
        if (qrString) {
          this.log('New QR code received. Please scan with your device.');
        }
      })
    );

    // Auto-connect to proxy on startup
    this.connect();
  }

  /**
   * Connects to the backend proxy.
   */
  connect() {
    this.connectionService.connect();
  }

  /**
   * Triggers a session reset (reconnect).
   */
  reconnect() {
    this.log('Requesting session reset...');
    this.connectionService.reconnectSession().subscribe({
      next: () => this.log('Session reset command sent successfully.'),
      error: (err) => this.log(`Reset failed: ${err.message}`)
    });
  }

  /**
   * Triggers a session disconnect.
   */
  disconnect() {
    this.log('Requesting disconnect...');
    this.connectionService.disconnectSession().subscribe({
      next: () => this.log('Disconnect command sent successfully.'),
      error: (err) => this.log(`Disconnect failed: ${err.message}`)
    });
  }

  /**
   * Sends the notification message via REST.
   */
  sendNotification() {
    if (!this.phoneNumber || !this.messageText || this.isSending) return;
    
    const newMessage: SentMessage = {
      id: Date.now(),
      to: this.phoneNumber,
      text: this.messageText,
      status: 'Sending...',
      timestamp: new Date().toLocaleTimeString()
    };
    
    this.messageHistory.unshift(newMessage);
    this.isSending = true;
    
    this.connectionService.sendNotification(this.phoneNumber, this.messageText).subscribe({
      next: (response) => {
        console.log('[AppComponent] Notification success response received:', response);
        newMessage.status = 'Sent ✅';
        this.isSending = false;
        this.messageText = '';
        this.cdr.detectChanges(); // Force UI update
      },
      error: (err) => {
        console.error('[AppComponent] Notification error received:', err);
        newMessage.status = 'Failed ❌';
        newMessage.error = err.error?.error || err.message;
        this.isSending = false;
        this.cdr.detectChanges(); // Force UI update
      }
    });
  }

  /**
   * Helper to log messages with timestamps.
   */
  private log(message: string) {
    const timestamp = new Date().toLocaleTimeString();
    this.logs.unshift(`[${timestamp}] ${message}`);
  }

  /**
   * Clean up on destruction.
   */
  ngOnDestroy() {
    this.subs.unsubscribe();
  }
}
