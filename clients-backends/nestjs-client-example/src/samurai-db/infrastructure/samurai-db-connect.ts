import { Inject, Injectable } from '@nestjs/common';
import { Socket, createConnection } from 'net';
import { MODULE_OPTIONS_TOKEN } from '../database.module-definition';
import { ModuleOptions } from '../interfaces/module-options';
import { ConnectionService } from './connection.service';

@Injectable()
export class SamuraiDBConnect extends ConnectionService {
  public client: Socket;
  private retryInterval: number;
  private attempt: number = 0; // Инициализация попыток с 0
  protected status: 'CONNECTING' | 'CONNECTED' = 'CONNECTING';

  private subscriptions = new Map<'connect' | 'reject', () => void>();

  constructor(@Inject(MODULE_OPTIONS_TOKEN) private options: ModuleOptions) {
    super();
    this.retryInterval = options.initialRetryInterval;
    this.connect();
  }

  private reconnect(err) {
    this.onReject();

    console.error('Connection error:', err?.message);
    this.status = 'CONNECTING';
    this.attempt++; // Увеличение счетчика попыток

    if (this.attempt <= this.options.maxRetries) {
      console.log(
        `Attempt ${this.attempt} failed. Retrying in ${this.retryInterval / 1000}s...`,
      );
      setTimeout(() => this.connect(), this.retryInterval);
      this.retryInterval *= 2; // Увеличение времени задержки
    } else {
      console.error('Max retries reached. Please check the server.');
    }
  }

  protected connect(): void {
    this.client = createConnection(
      { host: this.options.host, port: this.options.port },
      () => {
        console.log('Connected to server');
        this.status = 'CONNECTED';
        this.retryInterval = this.options.initialRetryInterval; // Сброс интервала при успешном подключении
        this.attempt = 0; // Сброс счетчика попыток при успешном подключении

        this.onConnect();
      },
    );

    this.client.on('error', (err) => {
      console.log('on error');
      this.reconnect(err);
    });

    this.client.on('end', (err) => {
      console.log('on end');
      this.reconnect(err);
    });
  }

  public subscribeToEvents(listener: 'connect', handler: () => void): void;
  public subscribeToEvents(listener: 'reject', handler: () => void): void;

  public subscribeToEvents(
    listener: 'connect' | 'reject',
    handler: () => void,
  ): void {
    this.subscriptions.set(listener, handler);
  }

  private onReject() {
    this.subscriptions.get('reject')?.();
  }
  private onConnect() {
    this.subscriptions.get('connect')?.();
  }
}
