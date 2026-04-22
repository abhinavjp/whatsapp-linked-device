import { Injectable } from '@angular/core';
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';
import { Subject, BehaviorSubject } from 'rxjs';

/**
 * Message structure for communication between Frontend and Backend.
 */
export interface WhatsAppMessage {
  type: string;
  data?: string;
  status?: string;
}

/**
 * Service responsible for managing the WebSocket connection to the .NET backend.
 * Uses RxJS subjects to expose incoming messages and connection state.
 * Strictly follows the Observer pattern.
 */
@Injectable({
  providedIn: 'root'
})
export class ConnectionService {
  private socket$: WebSocketSubject<WhatsAppMessage> | null = null;
  
  /** Stream of all raw messages */
  public messages$ = new Subject<WhatsAppMessage>();
  
  /** Stream specifically for WhatsApp QR code authentication strings */
  public qr$ = new Subject<string>();
  
  /** Current connection status of the WebSocket */
  public isConnected$ = new BehaviorSubject<boolean>(false);

  /**
   * Establishes a connection to the .NET backend proxy.
   */
  public connect(): void {
    if (!this.socket$ || this.socket$.closed) {
      this.socket$ = webSocket('ws://localhost:9000/ws/whatsapp');
      
      this.socket$.subscribe({
        next: (msg) => {
          this.messages$.next(msg);
          
          // Handle specific message types from the Node.js microservice (proxied through .NET)
          if (msg.type === 'qr' && msg.data) {
            this.qr$.next(msg.data);
          } else if (msg.type === 'status') {
            if (msg.data === 'connected') {
              this.isConnected$.next(true);
            } else if (msg.data === 'disconnected') {
              this.isConnected$.next(false);
            }
          }
        },
        error: (err) => {
          console.error('WebSocket Error:', err);
          this.isConnected$.next(false);
        },
        complete: () => {
          console.log('WebSocket connection closed.');
          this.isConnected$.next(false);
        }
      });
    }
  }

  /**
   * Sends a message to the backend.
   * @param msg Message to send
   */
  public sendMessage(msg: any): void {
    this.socket$?.next(msg);
  }

  /**
   * Closes the connection.
   */
  public disconnect(): void {
    this.socket$?.complete();
    this.socket$ = null;
    this.isConnected$.next(false);
  }
}
