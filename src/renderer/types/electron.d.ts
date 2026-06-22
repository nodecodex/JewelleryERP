import { IpcApi } from '../../shared/ipc-api';

declare global {
  interface Window {
    api: IpcApi;
  }
}
