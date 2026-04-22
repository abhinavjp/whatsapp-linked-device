import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConnectionService } from './services/connection.service';
import { QRCodeComponent } from 'angularx-qrcode';
import { Subscription } from 'rxjs';

/**
 * Root component of the Angular application.
 * Manages the UI state and interactions for the WhatsApp Linked Device feature.
 */
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, QRCodeComponent],
  templateUrl: './app.html',
  styleUrls: ['./app.css']
})
export class AppComponent implements OnInit, OnDestroy {
  /** Indicates if the WebSocket connection is established */
  isConnected = false;
  
  /** The current QR code string received from Baileys */
  qrData: string | null = null;
  
  /** Activity logs to display in the UI */
  logs: string[] = [];
  
  private subs = new Subscription();

  constructor(private connectionService: ConnectionService) {}

  /**
   * Initializes the component and sets up subscriptions to the ConnectionService.
   */
  ngOnInit() {
    // Subscribe to connection status changes
    this.subs.add(
      this.connectionService.isConnected$.subscribe(status => {
        this.isConnected = status;
        if (status) {
          this.log('Connected to WhatsApp via .NET Proxy.');
        } else {
          this.log('Disconnected.');
          this.qrData = null;
        }
      })
    );

    // Subscribe to incoming messages for logging
    this.subs.add(
      this.connectionService.messages$.subscribe(msg => {
        if (msg.type === 'status') {
          this.log(`Node.js status: ${msg.data}`);
        } else if (msg.type !== 'qr') {
          this.log(`System event: ${JSON.stringify(msg)}`);
        }
      })
    );

    // Subscribe specifically to QR code updates
    this.subs.add(
      this.connectionService.qr$.subscribe(qrString => {
        this.qrData = qrString;
        this.log('New WhatsApp QR Code received. Please scan with your mobile device.');
      })
    );
  }

  /**
   * Initiates the connection to the .NET backend.
   */
  connect() {
    this.log('Initiating connection to .NET Backend...');
    this.connectionService.connect();
  }

  /**
   * Disconnects from the backend.
   */
  disconnect() {
    this.connectionService.disconnect();
  }

  /**
   * Helper to log messages with timestamps.
   * @param message Message to log
   */
  private log(message: string) {
    const timestamp = new Date().toLocaleTimeString();
    this.logs.unshift(`[${timestamp}] ${message}`);
  }

  /**
   * Clean up subscriptions on destruction.
   */
  ngOnDestroy() {
    this.subs.unsubscribe();
  }
}
