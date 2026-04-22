import { Injectable } from '@angular/core';
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';
import { Subject, BehaviorSubject } from 'rxjs';

export interface WhatsAppMessage {
  type: string;
  data?: string;
  status?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ConnectionService {
  private socket$: WebSocketSubject<WhatsAppMessage> | null = null;
  public messages$ = new Subject<WhatsAppMessage>();
  public isConnected$ = new BehaviorSubject<boolean>(false);

  public connect(): void {
    if (!this.socket$ || this.socket$.closed) {
      this.socket$ = webSocket('ws://localhost:9000/ws/whatsapp');
      
      this.socket$.subscribe({
        next: (msg) => {
          this.messages$.next(msg);
          if (msg.type === 'init_handshake') {
            this.isConnected$.next(true);
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

  public sendMessage(msg: any): void {
    this.socket$?.next(msg);
  }

  public disconnect(): void {
    this.socket$?.complete();
    this.socket$ = null;
    this.isConnected$.next(false);
  }
}
