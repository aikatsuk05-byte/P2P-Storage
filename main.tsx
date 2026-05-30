import React, { useState } from 'react';
import { 
  Folder, 
  FileText, 
  Image, 
  Video, 
  Music, 
  Database,
  Wifi, 
  WifiOff, 
  Bluetooth, 
  Copy, 
  Clipboard, 
  Check, 
  Loader2, 
  Zap, 
  Trash2, 
  Plus, 
  Sliders, 
  Activity, 
  Lock, 
  HardDrive, 
  RefreshCw, 
  ArrowRightLeft,
  Smartphone,
  ChevronRight,
  Shield,
  Clock
} from 'lucide-react';
import { SimulatedFile, DeviceState, P2PConnection, TransferEvent, AndroidApp } from '../types';
import { motion, AnimatePresence } from 'motion/react';

// Format bytes helper
export const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 o';
  const k = 1024;
  const sizes = ['Octets', 'Ko', 'Mo', 'Go'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

interface AppProps {
  device: DeviceState;
  peerDevice: DeviceState;
  connection: P2PConnection;
  onUpdateFiles: (deviceId: DeviceState['id'], files: SimulatedFile[]) => void;
  onUpdateP2P: (updates: Partial<P2PConnection>) => void;
  onTriggerTransfer: (
    file: SimulatedFile, 
    sourceId: DeviceState['id'], 
    destId: DeviceState['id'],
    onComplete: () => void
  ) => void;
  onSetOpenApp: (app: AndroidApp) => void;
  onSetWallpaper: (index: number) => void;
  onToggleP2PSubsystems: (subsystem: 'ble' | 'wifi') => void;
  onTriggerNegotiation: () => void;
  pasteboard: SimulatedFile | null;
  onSetPasteboard: (file: SimulatedFile | null) => void;
}

// ==========================================
// 1. FILE EXPLORER APP (EXPLORATEUR DE FICHIERS)
// ==========================================
export const FileExplorer: React.FC<AppProps> = ({
  device,
  peerDevice,
  connection,
  onUpdateFiles,
  onTriggerTransfer,
  pasteboard,
  onSetPasteboard,
}) => {
  const [activePartition, setActivePartition] = useState<'local' | 'partner'>('local');
  const [selectedFile, setSelectedFile] = useState<SimulatedFile | null>(null);
  const [isCreatingFile, setIsCreatingFile] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [newFileType, setNewFileType] = useState<SimulatedFile['type']>('document');
  const [newFileSizeMb, setNewFileSizeMb] = useState('15');
  const [transferringId, setTransferringId] = useState<string | null>(null);
  const [transferProgress, setTransferProgress] = useState(0);

  const getIcon = (type: SimulatedFile['type']) => {
    switch (type) {
      case 'folder': return <Folder className="w-5 h-5 text-amber-500 fill-amber-500/20" />;
      case 'document': return <FileText className="w-5 h-5 text-blue-500" />;
      case 'image': return <Image className="w-5 h-5 text-emerald-500" />;
      case 'video': return <Video className="w-5 h-5 text-indigo-500" />;
      case 'music': return <Music className="w-5 h-5 text-pink-500" />;
      default: return <FileText className="w-5 h-5 text-neutral-500" />;
    }
  };

  const currentFiles = activePartition === 'local' 
    ? device.files 
    : (connection.status === 'connected' ? peerDevice.files : []);

  const handleCopy = (file: SimulatedFile) => {
    onSetPasteboard(file);
  };

  const handlePaste = () => {
    if (!pasteboard) return;
    const isPasteToPeerPartition = activePartition === 'partner';
    
    // Determine transfer source vs destination
    const sourceId = isPasteToPeerPartition ? device.id : peerDevice.id;
    const destId = isPasteToPeerPartition ? peerDevice.id : device.id;

    // Check if file already exists in target to prevent double copy error
    const targetFiles = isPasteToPeerPartition ? peerDevice.files : device.files;
    const isDuplicate = targetFiles.some(f => f.name === pasteboard.name);
    const finalName = isDuplicate 
      ? pasteboard.name.replace(/(\.[\w\d]+)$/, ' (Copie)$1') 
      : pasteboard.name;

    const fileToTransfer: SimulatedFile = {
      ...pasteboard,
      id: Math.random().toString(36).substring(7),
      name: finalName,
      updatedAt: new Date().toLocaleString('fr-FR'),
    };

    setTransferringId(fileToTransfer.id);
    setTransferProgress(0);

    // Simulate direct P2P link performance indicator
    // High speeds like 1 GB/s mean near-instant completion
    let progress = 0;
    const interval = setInterval(() => {
      progress += 15;
      if (progress >= 100) {
        clearInterval(interval);
        setTransferProgress(100);
        
        onTriggerTransfer(fileToTransfer, sourceId, destId, () => {
          setTransferringId(null);
          onSetPasteboard(null); // clear clipboard
        });
      } else {
        setTransferProgress(progress);
      }
    }, 80);
  };

  const handleDelete = (id: string) => {
    if (activePartition === 'local') {
      const updated = device.files.filter(f => f.id !== id);
      onUpdateFiles(device.id, updated);
    } else {
      const updated = peerDevice.files.filter(f => f.id !== id);
      onUpdateFiles(peerDevice.id, updated);
    }
    if (selectedFile?.id === id) {
      setSelectedFile(null);
    }
  };

  const handleCreateFile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFileName.trim()) return;

    const sizeInBytes = parseFloat(newFileSizeMb) * 1024 * 1024;
    const extension = newFileType === 'document' ? '.pdf' : 
                      newFileType === 'image' ? '.jpg' : 
                      newFileType === 'video' ? '.mp4' : '.mp3';
    
    const formattedName = newFileName.includes('.') 
      ? newFileName 
      : `${newFileName}${extension}`;

    const newFile: SimulatedFile = {
      id: Math.random().toString(36).substring(7),
      name: formattedName,
      type: newFileType,
      size: sizeInBytes,
      updatedAt: new Date().toLocaleString('fr-FR'),
    };

    if (activePartition === 'local') {
      onUpdateFiles(device.id, [...device.files, newFile]);
    } else {
      onUpdateFiles(peerDevice.id, [...peerDevice.files, newFile]);
    }

    setNewFileName('');
    setIsCreatingFile(false);
  };

  const totalLocalSize = device.files.reduce((acc, f) => acc + f.size, 0);
  const totalPeerSize = peerDevice.files.reduce((acc, f) => acc + f.size, 0);

  return (
    <div className="flex flex-col h-full bg-black/30 backdrop-blur-md text-[#e3e3e3] font-sans" id={`explorer-${device.id}`}>
      {/* Header */}
      <div className="p-4 bg-black/40 border-b border-white/5 flex justify-between items-center">
        <div>
          <h2 className="text-sm font-bold tracking-tight text-white uppercase font-display">Fichiers Unity</h2>
          <p className="text-[9px] text-[#3ddc84] font-mono uppercase font-black tracking-wider">Unification de Stockage</p>
        </div>
        <div className="flex items-center gap-1.5 bg-white/5 py-1 px-2.5 rounded-full text-[9px] font-mono border border-white/10 text-[#3ddc84]">
          <HardDrive className="w-3.5 h-3.5" />
          <span className="font-bold">MAPPED SECTOR</span>
        </div>
      </div>

      {/* Connection warning banner if looking at partner partition which is disconnected */}
      {activePartition === 'partner' && connection.status !== 'connected' && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 p-4 flex items-start gap-3">
          <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 mt-0.5">
            <WifiOff className="w-4 h-4" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-bold text-amber-300">Partition réseau hors-ligne</p>
            <p className="text-[10px] text-white/55 mt-1 leading-normal">
              Activez le Wi-Fi Direct P2P pour monter le disque externe ({peerDevice.modelName}) comme partition locale.
            </p>
          </div>
        </div>
      )}

      {/* Partitions Switcher */}
      <div className="p-1.5 bg-black/25 grid grid-cols-2 gap-1.5 border-b border-white/5">
        <button
          onClick={() => setActivePartition('local')}
          className={`py-1.5 rounded-xl text-[11px] font-bold transition flex items-center justify-center gap-2 font-mono uppercase ${
            activePartition === 'local' 
              ? 'bg-white/5 text-[#3ddc84] border border-white/10 shadow-lg' 
              : 'text-white/40 hover:text-white hover:bg-white/5'
          }`}
          id={`tab-local-${device.id}`}
        >
          <Database className="w-3.5 h-3.5" />
          Stockage Interne
        </button>
        <button
          onClick={() => setActivePartition('partner')}
          className={`py-1.5 rounded-xl text-[11px] font-bold transition flex items-center justify-center gap-2 font-mono uppercase relative ${
            activePartition === 'partner' 
              ? 'bg-white/5 text-[#4285f4] border border-white/10 shadow-lg' 
              : 'text-white/40 hover:text-white hover:bg-white/5'
          }`}
          id={`tab-remote-${device.id}`}
        >
          <Zap className={`w-3.5 h-3.5 ${connection.status === 'connected' ? 'text-[#4285f4] fill-[#4285f4]/20' : 'text-white/20'}`} />
          stockage_etendu
          {connection.status === 'connected' && (
            <span className="absolute top-1.5 right-2 w-1.5 h-1.5 rounded-full bg-[#4285f4] animate-pulse" />
          )}
        </button>
      </div>

      {/* Top Storage Bar */}
      <div className="px-4 py-2.5 bg-black/20 border-b border-white/5 text-[9px] flex justify-between items-center text-white/40 font-mono">
        <div className="flex gap-1.5 items-center">
          <span className="uppercase tracking-wider">Usage : </span>
          <span className="font-bold text-white/80">
            {formatBytes(activePartition === 'local' ? totalLocalSize : totalPeerSize)}
          </span>
          {activePartition === 'local' && connection.status === 'connected' && (
            <span className="text-[#3ddc84] font-black">
              (+ {formatBytes(totalPeerSize)} virtuels)
            </span>
          )}
        </div>
        <div className="px-2 py-0.5 rounded bg-white/5 text-white/55 font-bold uppercase tracking-wider">
          {activePartition === 'local' ? 'Local /sdcard' : `/mnt/p2p_${peerDevice.id.replace('phone-', '')}`}
        </div>
      </div>

      {/* Files List Panel */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2 relative" id={`file-list-${device.id}`}>
        {currentFiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-neutral-500 py-12">
            <Folder className="w-12 h-12 stroke-[1.2] text-neutral-600 mb-2.5" />
            <p className="text-xs font-medium">Aucun fichier à afficher</p>
            <p className="text-[10px] text-neutral-600 mt-1 max-w-[200px]">
              {activePartition === 'partner' 
                ? 'Reliez les deux appareils pour émuler le stockage partagé virtuel sans fil.' 
                : 'Créez un nouveau document ou transférez-en un depuis un autre espace.'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {currentFiles.map((file) => {
              const isSelected = selectedFile?.id === file.id;
              const isTransferring = transferringId === file.id;

              return (
                <div key={file.id} className="relative">
                  <div
                    onClick={() => isTransferring ? null : setSelectedFile(isSelected ? null : file)}
                    className={`p-3 rounded-2xl flex items-center justify-between border cursor-pointer transition-all duration-200 ${
                      isSelected 
                        ? 'bg-white/10 border-[#3ddc84]/50 shadow-lg' 
                        : 'bg-black/30 border-white/5 hover:border-white/10 hover:bg-white/[0.04]'
                    }`}
                    id={`file-item-${file.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-black/60 border border-white/5">
                        {getIcon(file.type)}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white line-clamp-1">{file.name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[9px] text-[#3ddc84] font-semibold font-mono">{formatBytes(file.size)}</span>
                          <span className="text-white/30 font-mono text-[9px]">•</span>
                          <span className="text-[9px] text-white/40 font-mono">{file.updatedAt}</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Action indicators */}
                    <div className="flex items-center gap-1">
                      {isTransferring && (
                        <div className="flex items-center gap-1.5 text-amber-400 font-mono text-[10px]">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>{transferProgress}%</span>
                        </div>
                      )}
                      {!isTransferring && (
                        <ChevronRight className="w-3.5 h-3.5 text-neutral-600" />
                      )}
                    </div>
                  </div>

                  {/* Context menu for selected file */}
                  <AnimatePresence>
                    {isSelected && !isTransferring && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.96, y: -4 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.96, y: -4 }}
                        className="mt-1.5 p-1.5 bg-black/[0.85] rounded-xl border border-white/10 flex items-center justify-between gap-2 shadow-2xl z-10 backdrop-blur-md"
                      >
                        <button
                          onClick={() => handleCopy(file)}
                          className="flex-1 py-1.5 rounded-lg text-[10px] font-bold bg-white/5 hover:bg-[#3ddc84] text-white hover:text-black border border-white/5 flex items-center justify-center gap-1.5 transition-all"
                        >
                          <Copy className="w-3 h-3" />
                          Copier
                        </button>
                        <button
                          onClick={() => handleDelete(file.id)}
                          className="px-3 py-1.5 rounded-lg text-[10px] font-bold bg-rose-500/10 hover:bg-rose-500 hover:text-black border border-rose-500/20 text-rose-400 flex items-center justify-center gap-1.5 transition-all"
                        >
                          <Trash2 className="w-3 h-3" />
                          Supprimer
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Floating Action / Transfer Dock */}
      <div className="p-3 bg-black/40 border-t border-white/5 space-y-2">
        {pasteboard && (
          <div className="bg-[#3ddc84]/10 border border-[#3ddc84]/20 p-2.5 rounded-2xl flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-2">
              <Clipboard className="w-4 h-4 text-[#3ddc84] animate-pulse" />
              <div>
                <p className="text-[10px] text-[#3ddc84] font-bold uppercase tracking-wider font-mono">Presse-papiers P2P</p>
                <p className="text-xs font-bold text-white line-clamp-1">{pasteboard.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button 
                onClick={() => onSetPasteboard(null)}
                className="text-[10px] text-white/40 hover:text-white px-2 py-1 font-mono uppercase"
              >
                Annuler
              </button>
              <button
                onClick={handlePaste}
                className="px-3 py-1.5 bg-[#3ddc84] text-black font-black rounded-lg text-[10px] uppercase font-mono tracking-wider flex items-center gap-1 transition"
                id={`paste-btn-${device.id}`}
              >
                <Zap className="w-3 h-3 text-black fill-black/25" />
                Coller
              </button>
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={() => setIsCreatingFile(!isCreatingFile)}
            className="flex-1 py-2 bg-white/5 hover:bg-white/10 text-white border border-white/10 font-bold rounded-xl text-xs uppercase tracking-wide font-mono flex items-center justify-center gap-1.5 transition"
            id={`create-file-toggle-${device.id}`}
          >
            <Plus className="w-4 h-4" />
            Créer un fichier
          </button>
        </div>

        {/* Create File Modal Form overlay inline */}
        {isCreatingFile && (
          <form onSubmit={handleCreateFile} className="p-3.5 bg-black/85 rounded-2xl border border-white/10 space-y-3 shadow-2xl">
            <h4 className="text-[10px] font-black text-[#3ddc84] uppercase tracking-wider font-mono">Nouveau Fichier Simulé</h4>
            <div className="space-y-2.5 text-xs text-white/80">
              <input
                type="text"
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                placeholder="Ex Nom_Fichier"
                className="w-full bg-black text-white px-2.5 py-1.5 rounded-lg border border-white/10 focus:outline-none focus:border-[#3ddc84] text-xs font-mono"
                required
              />
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <label className="text-[9px] text-white/45 uppercase font-black font-mono">Type</label>
                  <select
                    value={newFileType}
                    onChange={(e) => setNewFileType(e.target.value as any)}
                    className="w-full bg-black p-1.5 rounded-lg border border-white/10 text-[10px] text-white focus:outline-none focus:border-[#3ddc84]"
                  >
                    <option value="document">📄 PDF / Doc</option>
                    <option value="image">🖼️ Image JPG</option>
                    <option value="video">🎥 Vidéo MP4</option>
                    <option value="music">🎵 Musique MP3</option>
                  </select>
                </div>
                <div>
                  <label className="text-[9px] text-white/45 uppercase font-black font-mono">Taille (Mo)</label>
                  <input
                    type="number"
                    value={newFileSizeMb}
                    onChange={(e) => setNewFileSizeMb(e.target.value)}
                    className="w-full bg-black p-1.5 rounded-lg border border-white/10 text-[10px] text-white font-mono focus:outline-none focus:border-[#3ddc84]"
                    min="0.1"
                    max="1000"
                    step="0.1"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-1.5 pt-2 text-[10px] font-mono uppercase tracking-wide">
              <button
                type="button"
                onClick={() => setIsCreatingFile(false)}
                className="px-2.5 py-1 text-white/40 hover:text-white"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-3.5 py-1.5 bg-[#3ddc84] rounded-lg text-black font-black"
              >
                Générer
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};


// ==========================================
// 2. INTERACTIVE P2P NEGOTIATOR APP (WIFI ROUTERLESS HANDSHAKE)
// ==========================================
export const P2PNegotiator: React.FC<AppProps> = ({
  device,
  peerDevice,
  connection,
  onTriggerNegotiation,
  onToggleP2PSubsystems,
}) => {
  const isBle = device.bleEnabled;
  const isWifi = device.wifiDirectEnabled;

  return (
    <div className="flex flex-col h-full bg-black/30 backdrop-blur-md text-[#e3e3e3] font-sans p-4 space-y-4" id={`negotiator-${device.id}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-black tracking-wider text-white uppercase flex items-center gap-1.5 font-display">
            <Zap className="w-5 h-5 text-[#3ddc84]" />
            Liaison Wi-Fi Direct
          </h2>
          <p className="text-[9px] text-[#3ddc84] font-mono uppercase font-semibold">P2P Routeurless Connection</p>
        </div>
        <div className="flex gap-1.5">
          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold font-mono tracking-wide ${
            connection.status === 'connected' 
              ? 'bg-[#3ddc84]/15 text-[#3ddc84] border border-[#3ddc84]/30' 
              : 'bg-white/5 text-white/40 border border-white/5'
          }`}>
            {connection.status === 'connected' ? 'MONTE' : 'HORS-LIGNE'}
          </span>
        </div>
      </div>

      {/* Concept Architecture Card */}
      <div className="p-3.5 bg-black/55 border border-white/10 rounded-2xl space-y-2.5 shadow-xl">
        <p className="text-xs font-black text-white uppercase flex items-center gap-1.5 font-mono">
          <Shield className="w-3.5 h-3.5 text-[#3ddc84]" />
          Protocole Hybride Direct-Link
        </p>
        <p className="text-[10px] text-white/60 leading-relaxed">
          Cette application négocie un lien sécurisé <span className="text-[#3ddc84] font-bold">sans box internet</span>. Elle combine le <span className="text-[#4285f4] font-bold font-mono">BLE</span> (découverte continue) et le <span className="text-[#3ddc84] font-bold font-mono">Wi-Fi Direct P2P</span> (canal hôte ultra-rapide).
        </p>
        <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-[9px] font-bold">
          <div onClick={() => onToggleP2PSubsystems('ble')} className={`p-2.5 rounded-xl border cursor-pointer transition-all duration-200 ${isBle ? 'bg-[#4285f4]/10 border-[#4285f4]/40 text-[#4285f4]' : 'bg-white/5 border-white/5 text-white/20'}`}>
            <div className="flex justify-between items-center mb-0.5">
              <span>1. BLE DISCOVERY</span>
              <Bluetooth className={`w-3.5 h-3.5 ${isBle ? 'text-[#4285f4]' : 'text-white/20'}`} />
            </div>
            <span>{isBle ? 'ACTIF (Beaconing)' : 'DESACTIVE'}</span>
          </div>
          <div onClick={() => onToggleP2PSubsystems('wifi')} className={`p-2.5 rounded-xl border cursor-pointer transition-all duration-200 ${isWifi ? 'bg-[#3ddc84]/10 border-[#3ddc84]/40 text-[#3ddc84]' : 'bg-white/5 border-white/5 text-white/20'}`}>
            <div className="flex justify-between items-center mb-0.5">
              <span>2. WI-FI P2P</span>
              <Wifi className={`w-3.5 h-3.5 ${isWifi ? 'text-[#3ddc84] animate-pulse' : 'text-white/20'}`} />
            </div>
            <span>{isWifi ? 'ACTIF (P2P Host)' : 'DESACTIVE'}</span>
          </div>
        </div>
      </div>

      {/* Link State Visual Representation */}
      <div className="p-4 bg-black/45 rounded-2xl border border-white/10 flex flex-col items-center justify-center space-y-4 shadow-xl">
        
        {/* Animated Handshake Graphics */}
        <div className="relative flex items-center justify-center gap-8 w-full py-4 bg-black/60 rounded-xl border border-white/5">
          {/* Device left */}
          <div className="flex flex-col items-center">
            <Smartphone className="w-8 h-8 text-[#3ddc84]" />
            <span className="text-[9px] font-mono mt-1 text-white font-bold">ALPHA</span>
          </div>

          {/* Connection Conduit Animations */}
          <div className="flex-1 max-w-[120px] relative h-6 flex items-center justify-center font-bold">
            {connection.status === 'connected' ? (
              <>
                <div className="absolute w-full h-[2px] bg-[#3ddc84]/20 animate-pulse" />
                <motion.div 
                  initial={{ left: 0 }}
                  animate={{ left: '100%' }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
                  className="absolute w-2.5 h-2.5 rounded-full bg-[#3ddc84] shadow-lg shadow-[#3ddc84]"
                />
                <motion.div 
                  initial={{ right: 0 }}
                  animate={{ right: '100%' }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
                  className="absolute w-2.5 h-2.5 rounded-full bg-[#4285f4] shadow-lg shadow-[#4285f4]"
                />
                <Zap className="absolute w-4 h-4 text-[#3ddc84] stroke-[2.5]" />
              </>
            ) : connection.status === 'wifi-securing' || connection.status === 'handshake' ? (
              <div className="flex gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 rounded-full bg-[#3ddc84] animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 rounded-full bg-[#4285f4] animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            ) : connection.status === 'ble-discovery' ? (
              <div className="border-t border-dashed border-[#4285f4]/40 w-full animate-pulse flex justify-between px-2 text-[8px] text-[#4285f4] font-mono font-bold">
                <span>⚡ BLE HANDSHAKE</span>
              </div>
            ) : (
              <div className="border-t border-dotted border-white/10 w-full" />
            )}
          </div>

          {/* Device right */}
          <div className="flex flex-col items-center">
            <Smartphone className="w-8 h-8 text-[#4285f4]" />
            <span className="text-[9px] font-mono mt-1 text-white font-bold">BETA</span>
          </div>
        </div>

        {/* Handshake Details Status Indicator */}
        <div className="w-full text-xs space-y-2 pt-1 font-mono">
          <div className="flex justify-between py-1.5 border-b border-white/5">
            <span className="text-white/40 uppercase text-[9px] font-bold">Statut Phase</span>
            <span className="font-bold text-white text-right">
              {connection.status === 'disconnected' && '⚠️ Réseau inactif'}
              {connection.status === 'ble-discovery' && '🔍 BLE : Publicité & Scanner'}
              {connection.status === 'handshake' && '🤝 Handshake : Échange Certificats'}
              {connection.status === 'wifi-securing' && '🔒 Sécurisation WPA3-P2P'}
              {connection.status === 'connected' && '✅ Connecté & Partition Montée'}
            </span>
          </div>
          {connection.status === 'connected' && (
            <>
              <div className="flex justify-between py-1.5 border-b border-white/5">
                <span className="text-white/40 uppercase text-[9px] font-bold">Canal</span>
                <span className="font-bold text-amber-400">{connection.channel}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-white/5">
                <span className="text-white/40 uppercase text-[9px] font-bold">Lien Direct</span>
                <span className="font-bold text-[#3ddc84]">{connection.speedMbps} Mo/s (Wi-Fi 7)</span>
              </div>
              <div className="flex justify-between py-1 text-[9px] text-white/30 italic">
                <span>*Aucun routeur externe ni abonnement 4G/5G utilisé.</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Main Negotiation Action Button */}
      <button
        onClick={onTriggerNegotiation}
        disabled={connection.status === 'connected' && (device.p2pStatus === 'connected')}
        className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 border shadow-lg text-[11px] uppercase tracking-wider font-mono transition-all duration-300 ${
          connection.status === 'connected' 
            ? 'bg-white/5 hover:bg-white/10 text-[#3ddc84] border-white/10' 
            : 'bg-[#3ddc84] hover:bg-[#3ddc84]/90 text-black font-black border-[#3ddc84]'
        }`}
        id={`negotiation-trigger-${device.id}`}
      >
        <RefreshCw className={`w-4 h-4 ${connection.status !== 'disconnected' && connection.status !== 'connected' ? 'animate-spin' : ''}`} />
        {connection.status === 'disconnected' && 'Démarrer la Négociation Directe'}
        {connection.status === 'ble-discovery' && 'Recherche en cours...'}
        {connection.status === 'handshake' && 'Négociation des Clés...'}
        {connection.status === 'wifi-securing' && 'Connexion Wi-Fi Direct...'}
        {connection.status === 'connected' && 'Optimiser le canal Wi-Fi Direct'}
      </button>

      {/* Transfer History / Performance Log */}
      {connection.status === 'connected' && (
        <div className="space-y-1.5 flex-1 overflow-y-auto">
          <p className="text-[9px] font-black text-white/45 uppercase tracking-wider font-mono">Historique de transfert</p>
          <div className="p-3 bg-black/45 border border-white/10 rounded-2xl space-y-2.5 shadow-xl">
            <div className="flex justify-between items-center text-[10px] text-white/55 font-mono">
              <span className="font-bold">SYNCHRONISATION ACTIVE</span>
              <span className="text-[#3ddc84] font-bold flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#3ddc84] animate-ping" />
                Métadonnées à jour
              </span>
            </div>
            
            <div className="border-t border-white/5 pt-2 space-y-1 text-[9px] font-bold text-white/45 font-mono">
              <p>• Disque étendu monté sur `/mnt/p2p_{peerDevice.id.replace('phone-', '')}`</p>
              <p>• Protocole : Wi-Fi Direct IEEE 802.11be (160 MHz)</p>
              <p>• Latence de synchronisation locale : &lt; 2.4 ms</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


// ==========================================
// 3. STORAGE & SYSTEM MONITOR APP (MONITEUR SYSTEME)
// ==========================================
export const SysMonitor: React.FC<AppProps> = ({
  device,
  peerDevice,
  connection,
}) => {
  const localSize = device.files.reduce((acc, f) => acc + f.size, 0);
  const peerSize = peerDevice.files.reduce((acc, f) => acc + f.size, 0);

  // Storage metrics
  const localCapacity = 128 * 1024 * 1024 * 1024; // 128 GB simulated
  const virtualCapacity = localCapacity + (connection.status === 'connected' ? localCapacity : 0);
  const totalUsedSize = localSize + (connection.status === 'connected' ? peerSize : 0);

  const localUsedPercent = (localSize / (2 * 1024 * 1024 * 1024)) * 100; // normalized for visual bars
  const totalUsedPercent = (totalUsedSize / (4 * 1024 * 1024 * 1024)) * 100;

  return (
    <div className="flex flex-col h-full bg-black/30 backdrop-blur-md text-[#e3e3e3] font-sans p-4 space-y-4" id={`monitor-${device.id}`}>
      {/* Header */}
      <div>
        <h2 className="text-sm font-black text-white uppercase flex items-center gap-2 font-display tracking-wider">
          <Activity className="w-5 h-5 text-[#3ddc84]" />
          Moniteur Système OS
        </h2>
        <p className="text-[9px] text-[#3ddc84] font-mono uppercase font-semibold">Stockage P2P & Liaison Matérielle</p>
      </div>

      {/* Dynamic Storage Expansion Graph */}
      <div className="p-4 bg-black/55 rounded-2xl border border-white/10 space-y-3.5 shadow-xl">
        <p className="text-xs font-black text-white uppercase font-mono tracking-wide">État d'extension du stockage</p>
        
        {/* Progress representation */}
        <div className="space-y-3 font-mono">
          <div>
            <div className="flex justify-between text-[9px] text-white/50 mb-1">
              <span className="font-bold">Disque Dur Interne</span>
              <span className="font-bold text-white/80">{formatBytes(localSize)} / 128 Go</span>
            </div>
            <div className="h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
              <div 
                className="h-full bg-[#3ddc84] transition-all duration-500 shadow-md shadow-[#3ddc84]/50" 
                style={{ width: `${Math.max(4, Math.min(100, localUsedPercent))}%` }} 
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-[9px] text-white/50 mb-1">
              <span className="font-bold">Partition Étendue ({peerDevice.modelName})</span>
              <span className="font-bold text-white/80">
                {connection.status === 'connected' ? `+ ${formatBytes(peerSize)} / 128 Go` : 'Indisponible'}
              </span>
            </div>
            <div className="h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
              <div 
                className={`h-full bg-[#4285f4] transition-all duration-500 shadow-md shadow-[#4285f4]/50 ${connection.status === 'connected' ? '' : 'opacity-20'}`} 
                style={{ width: connection.status === 'connected' ? `${Math.max(4, Math.min(100, (peerSize / (2 * 1024 * 1024 * 1024)) * 100))}%` : '0%' }} 
              />
            </div>
          </div>
        </div>

        {/* Aggregate statistics */}
        <div className="pt-2 border-t border-white/5 grid grid-cols-2 gap-2 text-center font-mono">
          <div className="p-2.5 bg-black/40 rounded-xl border border-white/5">
            <span className="text-[8px] text-white/40 block uppercase font-bold tracking-wider">Espace Logique Total</span>
            <span className="text-xs font-black text-[#3ddc84]">
              {connection.status === 'connected' ? '256 Go' : '128 Go'}
            </span>
          </div>
          <div className="p-2.5 bg-black/40 rounded-xl border border-white/5">
            <span className="text-[8px] text-white/40 block uppercase font-bold tracking-wider">Amélioration Débit</span>
            <span className="text-xs font-black text-[#4285f4]">
              {connection.status === 'connected' ? '1.2 Go/s' : '0 Go/s'}
            </span>
          </div>
        </div>
      </div>

      {/* Network Bandwidth Indicator Card */}
      <div className="p-3.5 bg-black/55 border border-white/10 rounded-2xl text-xs space-y-2.5 shadow-xl">
        <div className="flex justify-between items-center text-[#3ddc84] font-semibold">
          <span className="flex items-center gap-1.5 uppercase tracking-wide font-mono text-[10px] font-bold">
            <ArrowRightLeft className="w-4 h-4 text-[#4285f4]" />
            Canal Peer-to-Peer Wi-Fi Direct
          </span>
          <span className="text-[8px] font-mono text-white/60 bg-white/5 py-0.5 px-2 rounded-full border border-white/10 uppercase tracking-wider font-bold">
            {connection.status === 'connected' ? 'Actif' : 'Inactif'}
          </span>
        </div>

        <p className="text-[10px] text-white/55 leading-normal">
          Le débit est négocié automatiquement. Sans box ni réseau cellulaire, le Wi-Fi Direct P2P monte des connexions point-à-point dédiées par modulation avancée.
        </p>

        <div className="p-3 bg-black/60 rounded-xl space-y-2 font-mono text-[9px] text-white/45 border border-white/5">
          <div className="flex justify-between">
            <span>Interface de liaison</span>
            <span className="text-white font-bold">wlan1-p2p0</span>
          </div>
          <div className="flex justify-between">
            <span>Fréquence & Canal</span>
            <span className="text-amber-400 font-bold">{connection.status === 'connected' ? connection.channel : 'Non alloué'}</span>
          </div>
          <div className="flex justify-between">
            <span>Cryptage local</span>
            <span className="text-[#3ddc84] font-bold">{connection.status === 'connected' ? 'WPA3-Personal-Direct' : 'Aucun'}</span>
          </div>
          <div className="flex justify-between">
            <span>Adresse IP direct-link</span>
            <span className="text-white font-bold">{connection.status === 'connected' ? (device.id === 'phone-alpha' ? '192.168.49.1' : '192.168.49.2') : 'Inexistante'}</span>
          </div>
        </div>
      </div>

      {/* Architecture checklist */}
      <div className="p-3 bg-black/20 border border-white/5 rounded-2xl">
        <p className="text-[9px] font-black text-white/45 uppercase tracking-wider font-mono mb-2">Avantages Clés Constatés</p>
        <ul className="space-y-1.5 text-[10px] text-white/55 font-bold">
          <li className="flex items-center gap-2">
            <Check className="w-3.5 h-3.5 text-[#3ddc84] flex-shrink-0" />
            <span>Aucun coût en données mobiles (0 Mo LTE/5G).</span>
          </li>
          <li className="flex items-center gap-2">
            <Check className="w-3.5 h-3.5 text-[#3ddc84] flex-shrink-0" />
            <span>La vitesse de copie s'adapte au standard Wi-Fi local sans bridage.</span>
          </li>
          <li className="flex items-center gap-2">
            <Check className="w-3.5 h-3.5 text-[#3ddc84] flex-shrink-0" />
            <span>Le système virtualise le disque comme s'il était câblé.</span>
          </li>
        </ul>
      </div>
    </div>
  );
};


// ==========================================
// 4. CONFIG ET SETTINGS APP
// ==========================================
export const SystemSettings: React.FC<AppProps> = ({
  device,
  onSetWallpaper,
  onToggleP2PSubsystems,
}) => {
  const wallpapers = [
    'linear-gradient(to bottom, #1e1b4b, #0f172a)', // Midnight Blue
    'linear-gradient(to bottom, #064e3b, #022c22)', // Forest
    'linear-gradient(to bottom, #3b0764, #120024)', // Purple Haze
    'linear-gradient(to bottom, #1c1917, #0c0a09)', // Obsidian
  ];

  const wallpaperNames = ['Bleu Nuit', 'Forêt Émeraude', 'Nébuleuse Violette', 'Noir Obsidienne'];

  return (
    <div className="flex flex-col h-full bg-black/30 backdrop-blur-md text-[#e3e3e3] font-sans p-4 space-y-4" id={`settings-${device.id}`}>
      {/* Header */}
      <div>
        <h2 className="text-sm font-black text-white uppercase flex items-center gap-2 font-display tracking-wider">
          <Sliders className="w-5 h-5 text-white/55" />
          Paramètres Communs
        </h2>
        <p className="text-[9px] text-[#3ddc84] font-mono uppercase font-semibold">Options de l'OS système</p>
      </div>

      {/* Network Config toggles */}
      <div className="p-4 bg-black/55 border border-white/10 rounded-2xl space-y-3.5 shadow-xl">
        <p className="text-xs font-black text-white uppercase font-mono tracking-wide">Réseaux Non-Filaires</p>
        
        <div className="space-y-3 text-xs">
          <div className="flex justify-between items-center">
            <div>
              <p className="font-bold text-white">Découverte BLE (Bluetooth LE)</p>
              <p className="text-[10px] text-white/50">Diffusion des ID et partitions virtuelles</p>
            </div>
            <button
              onClick={() => onToggleP2PSubsystems('ble')}
              className={`w-10 h-6 rounded-full p-0.5 transition-colors duration-200 relative ${device.bleEnabled ? 'bg-[#4285f4]' : 'bg-white/10'}`}
              id={`toggle-ble-${device.id}`}
            >
              <div className={`w-5 h-5 bg-black rounded-full shadow-md transition-transform duration-200 ${device.bleEnabled ? 'translate-x-4' : 'translate-x-0'}`} />
            </button>
          </div>

          <div className="flex justify-between items-center pt-3 border-t border-white/5">
            <div>
              <p className="font-bold text-white">Puce Wi-Fi Direct P2P</p>
              <p className="text-[10px] text-white/50">Transmission haut-débit sans point d'accès</p>
            </div>
            <button
              onClick={() => onToggleP2PSubsystems('wifi')}
              className={`w-10 h-6 rounded-full p-0.5 transition-colors duration-200 relative ${device.wifiDirectEnabled ? 'bg-[#3ddc84]' : 'bg-white/10'}`}
              id={`toggle-wifi-${device.id}`}
            >
              <div className={`w-5 h-5 bg-black rounded-full shadow-md transition-transform duration-200 ${device.wifiDirectEnabled ? 'translate-x-4' : 'translate-x-0'}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Choose wallpaper */}
      <div className="p-3.5 bg-black/55 border border-white/10 rounded-2xl space-y-3 shadow-xl">
        <p className="text-xs font-black text-white uppercase font-mono tracking-wide">Fond d'Écran de l'OS</p>
        <p className="text-[10px] text-white/50">Modifier l'ambiance visuelle d'accueil</p>
        
        <div className="grid grid-cols-2 gap-2 pt-1">
          {wallpapers.map((bg, idx) => (
            <div
              key={idx}
              onClick={() => onSetWallpaper(idx)}
              className={`p-2 rounded-xl text-[9px] font-mono cursor-pointer border text-center transition-all duration-200 flex flex-col justify-between items-center h-16 ${
                device.wallpaperIndex === idx 
                  ? 'border-[#3ddc84] bg-white/10 font-bold text-white shadow-lg' 
                  : 'border-white/5 hover:border-white/10 bg-black/40 text-white/40'
              }`}
              style={{ flexBasis: '48%' }}
              id={`wallpaper-select-${idx}-${device.id}`}
            >
              <div className="w-full h-5 rounded-md shadow-md" style={{ background: bg }} />
              <span className="mt-1 font-bold">{wallpaperNames[idx]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* About Section */}
      <div className="p-3 bg-black/20 border border-white/5 rounded-2xl space-y-1.5 text-[9px] text-white/40 font-mono">
        <p className="font-bold text-white/60 uppercase">Informations Matérielles Spécifiques :</p>
        <p>• Nom de machine : {device.name}</p>
        <p>• Modèle émulé : {device.modelName}</p>
        <p>• Code de compilation de l'OS : P2P-WIFI-DIRECT-EMULATOR-v5.3</p>
        <p>• Débit de transfert max testé : 1 200 Mo/s</p>
      </div>
    </div>
  );
};
