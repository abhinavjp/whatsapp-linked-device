import { Injectable } from '@angular/core';
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';
import { Subject, BehaviorSubject, Observable, timer, EMPTY } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { retry, delay, tap, catchError, switchMap } from 'rxjs/operators';

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
  private readonly apiUrl = 'http://localhost:9000/api/whatsapp';
  
  constructor(private http: HttpClient) {}

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
      
      this.socket$.pipe(
        tap(() => console.log('WebSocket message received')),
        catchError(err => {
          console.error('WebSocket Error:', err);
          this.isConnected$.next(false);
          // Auto-reconnect after 3 seconds
          return timer(3000).pipe(
            switchMap(() => {
                console.log('Attempting to reconnect...');
                this.connect();
                return EMPTY;
            })
          );
        })
      ).subscribe({
        next: (msg) => {
          this.messages$.next(msg);
          
          if (msg.type === 'qr' && msg.data) {
            this.qr$.next(msg.data);
          } else if (msg.type === 'status') {
            if (msg.data === 'connected') {
              this.isConnected$.next(true);
            } else if (msg.data === 'disconnected') {
              this.isConnected$.next(false);
              this.qr$.next('');
            }
          }
        },
        error: (err) => {
          console.error('WebSocket Subscription Error:', err);
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
   * Sends a WhatsApp message via the .NET REST Proxy.
   */
  public sendNotification(to: string, text: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/send`, { to, text });
  }

  /**
   * Disconnects the active session.
   */
  public disconnectSession(): Observable<any> {
    return this.http.post(`${this.apiUrl}/disconnect`, {});
  }

  /**
   * Reconnects (wipes session and starts fresh).
   */
  public reconnectSession(): Observable<any> {
    return this.http.post(`${this.apiUrl}/reconnect`, {});
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
