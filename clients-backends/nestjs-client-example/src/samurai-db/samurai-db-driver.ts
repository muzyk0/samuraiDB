import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { SamuraiDBConnect } from './samurai-db-connect';

@Injectable()
export class SamuraiDBDriver<T> extends SamuraiDBConnect {
  requestsMap = new Map<
    string,
    { resolve: (data: any) => void; reject: (data: any) => void }
  >();

  constructor() {
    super('localhost', 4001);

    this.tcpClient.on('data', (data) => {
      console.log('Received from server:', data.toString());
      const action = JSON.parse(data.toString());
      this.requestsMap.get(action.uuid)?.resolve(action);
      this.requestsMap.delete(action.uuid);
    });
  }

  async getById(id: string): Promise<T> {
    const { promise, uuid } = this.registerRequest<T>();
    const action = { type: 'GET', payload: { id: id }, uuid: uuid };
    this.tcpClient.write(JSON.stringify(action));
    return promise;
  }

  private registerRequest<T>() {
    const uuid = randomUUID();
    const promise = new Promise<T>((resolve, reject) => {
      this.requestsMap.set(uuid, { resolve, reject });
    });
    return { promise, uuid };
  }

  async deleteById(id: string): Promise<void> {
    const { promise, uuid } = this.registerRequest<void>();
    const action = { type: 'DELETE', payload: { id: Number(id) }, uuid: uuid };
    this.tcpClient.write(JSON.stringify(action));
    return promise;
  }

  async set<T extends { id: string }>(dto: Omit<T, 'id'>): Promise<T> {
    const { promise, uuid } = this.registerRequest<T>();
    const action = { type: 'SET', payload: { ...dto }, uuid: uuid };
    this.tcpClient.write(JSON.stringify(action));
    return promise;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async updateById<T>(id: string, dto: T): Promise<void> {
    return Promise.resolve();
  }
}