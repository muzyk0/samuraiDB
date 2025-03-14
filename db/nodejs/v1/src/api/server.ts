import { createServer } from 'net';
import SamuraiDB from '../core/samuraidb';
import { randomUUID } from 'crypto';
import { FileAdapter } from '../core/file.adapter';
import { join } from 'node:path';
import { IndexManager } from '../core/index-manager';
import {SegmentManager} from "../core/segment-manager";
import { CompactionManager } from '../core/compaction-manager';

const dir = join(__dirname, '..', '..', 'db');

const fileAdapter = new FileAdapter(dir);
const segmentManager = new SegmentManager(fileAdapter);
const indexManager = new IndexManager(fileAdapter);
const compactionManager = new CompactionManager(segmentManager, indexManager);
const db = new SamuraiDB(segmentManager, indexManager, compactionManager);

(async () => {
  await db.init();
})();

const server = createServer(async (socket) => {
  console.log('Client connected');

  socket.on('data', async (data) => {
    let requestAction = JSON.parse(data.toString().split('\n')[0]);

    console.log('Received from client:', data.toString());

    switch (requestAction.type) {
      case 'SET': {
        const id = randomUUID();
        await db.set(id, { ...requestAction.payload, id: id });
        let response = {
          ...requestAction.payload,
          id,
          uuid: requestAction.uuid,
        };
        console.log(JSON.stringify(response));
        socket.write(JSON.stringify(response));
        break;
      }
      case 'GET': {
        const data = await db.get(requestAction.payload.id);
        let response = {
          ...data,
          uuid: requestAction.uuid,
        };
        console.log('response: ', JSON.stringify(response));
        socket.write(JSON.stringify(response));
        break;
      }
      case 'DELETE': {
        const data = await db.delete(requestAction.payload.id);
        let response = {
          uuid: requestAction.uuid,
        };
        console.log('response: ', JSON.stringify(response));
        socket.write(JSON.stringify(response));
        break;
      }
      default: {
        console.error(`Unknown request type: ${requestAction.type}`);
        socket.write('Unknown request type');
        break;
      }
    }
  });

  socket.on('end', () => {
    console.log('Client disconnected');
  });

  socket.on('error', () => {
    console.log('Client error');
  });
});

server.listen(4001, () => {
  console.log('Server listening on port 4001');
});