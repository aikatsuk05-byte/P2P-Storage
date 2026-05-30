export interface SimulatedFile {
  id: string;
  name: string;
  size: number; // in bytes
  type: 'folder' | 'document' | 'image' | 'video' | 'music' | 'system';
  content?: string;
  updatedAt: string;
}

export type AndroidApp = 'home' | 'settings' | 'file-explorer' | 'p2p-negotiator' | 'sys-monitor';

export interface DeviceState {
  id: 'phone-alpha' | 'phone-beta';
  name: string;
  modelName: string;
  battery: number;
  bleEnabled: boolean;
  wifiDirectEnabled: boolean;
  p2pStatus: 'disconnected' | 'advertising' | 'discovering' | 'connecting' | 'connected';
  mountedPeerStorage: boolean; // if true, peer storage is visible as a local partition
  currentPath: string; // "local" or "extended"
  openApp: AndroidApp;
  wallpaperIndex: number;
  files: SimulatedFile[];
  clipboard: SimulatedFile | null;
}

export interface P2PConnection {
  status: 'disconnected' | 'ble-discovery' | 'handshake' | 'wifi-securing' | 'connected';
  channel: string; // e.g., "5 GHz (Ch 149)" or "6 GHz (Ch 37)"
  protocol: 'None' | 'BLE (Metadata Only)' | 'Wi-Fi Direct P2P (High Speed)';
  speedMbps: number; // 0 to 1200+ (Wi-Fi 6/7)
  signalStrength: number; // percentage
  transferredBytesThisSession: number;
}

export interface TransferEvent {
  id: string;
  fileName: string;
  fileSize: number;
  speedMbps: number;
  durationMs: number;
  timestamp: string;
  direction: 'alpha-to-beta' | 'beta-to-alpha';
}
