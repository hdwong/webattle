import { loadPackageDefinition } from '@grpc/grpc-js';
import { loadSync } from '@grpc/proto-loader';
import path from 'node:path';

export default {
  loadProto: async (protoName: string) => {
    const protoPath = path.join(__dirname, '../../protos', `${protoName}.proto`);
    const packageDefinition = loadSync(protoPath, {
      keepCase: true,
      longs: String,
      enums: String,
      defaults: true,
      oneofs: true,
    });
    return loadPackageDefinition(packageDefinition);
  },
}
