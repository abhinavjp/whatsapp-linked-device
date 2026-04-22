import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConnectionService } from './services/connection.service';
import { QRCodeComponent } from 'angularx-qrcode';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, QRCodeComponent],
  templateUrl: './app.html',
  styleUrls: ['./app.css']
})
export class AppComponent implements OnInit, OnDestroy {
  isConnected = false;
  qrData: string | null = null;
  logs: string[] = [];
  
  private subs = new Subscription();

  constructor(private connectionService: ConnectionService) {}

  ngOnInit() {
    this.subs.add(
      this.connectionService.isConnected$.subscribe(status => {
        this.isConnected = status;
        if (status) {
          this.log('Connected to WhatsApp Signal Protocol wrapper.');
        } else {
          this.log('Disconnected.');
          this.qrData = null;
        }
      })
    );

    this.subs.add(
      this.connectionService.messages$.subscribe(msg => {
        if (msg.type === 'qr_code' && msg.data) {
          this.qrData = msg.data;
          this.log('QR Code received. Waiting for MD scan...');
        } else if (msg.type === 'init_handshake') {
          this.log('Noise Protocol Handshake initialized.');
          // Simulate a small delay before requesting the QR code to mimic processing time
          setTimeout(() => {
             this.connectionService.sendMessage({ type: 'request_qr' });
          }, 1500);
        } else {
          this.log(`Received: ${JSON.stringify(msg)}`);
        }
      })
    );
  }

  connect() {
    this.log('Initiating connection to .NET Backend...');
    this.connectionService.connect();
  }

  disconnect() {
    this.connectionService.disconnect();
  }

  private log(message: string) {
    const timestamp = new Date().toLocaleTimeString();
    this.logs.unshift(`[${timestamp}] ${message}`);
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
  }
}
