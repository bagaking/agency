import { ipcRenderer } from 'electron';

type PayloadHandler<T = unknown> = (payload: T) => void;

type InvokeBridge = Record<string, (payload?: unknown) => Promise<unknown>>;
type SendBridge = Record<string, (payload?: unknown) => void>;
type SubscribeBridge = Record<string, (handler: PayloadHandler) => () => void>;

export function createInvokeBridge(channels: Record<string, string>): InvokeBridge {
  return Object.fromEntries(
    Object.entries(channels).map(([name, channel]) => [
      name,
      (payload?: unknown) => ipcRenderer.invoke(channel, payload),
    ])
  );
}

export function createSendBridge(channels: Record<string, string>): SendBridge {
  return Object.fromEntries(
    Object.entries(channels).map(([name, channel]) => [
      name,
      (payload?: unknown) => {
        ipcRenderer.send(channel, payload);
      },
    ])
  );
}

export function createSubscribeBridge(channels: Record<string, string>): SubscribeBridge {
  return Object.fromEntries(
    Object.entries(channels).map(([name, channel]) => [
      name,
      (handler: PayloadHandler) => {
        const wrapped = (_event: unknown, payload: unknown) => {
          handler(payload);
        };
        ipcRenderer.on(channel, wrapped);
        return () => {
          ipcRenderer.removeListener(channel, wrapped);
        };
      },
    ])
  );
}
