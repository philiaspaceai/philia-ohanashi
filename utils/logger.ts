export type LogType = 'INFO' | 'SEND' | 'RECV' | 'ERROR' | 'CONNECTION' | 'STATE' | 'IDLE' | 'INTERRUPT' | 'SYSTEM';

export interface LogEntry {
  timestamp: string;
  type: LogType;
  message: string;
  data?: any;
}

export interface SessionStats {
  bytesSent: number;
  bytesReceived: number;
  turnCount: number;
  lastSendTime: number;
  lastReceiveTime: number;
  startTime: number;
  lastState: string;
}

export class SessionLogger {
  private logs: LogEntry[] = [];
  private stats: SessionStats;

  constructor() {
    this.stats = {
      bytesSent: 0,
      bytesReceived: 0,
      turnCount: 0,
      lastSendTime: Date.now(),
      lastReceiveTime: 0,
      startTime: Date.now(),
      lastState: 'INITIALIZING'
    };
    
    // Safely attempt to get sample rate without crashing or leaking contexts
    let sampleRate = 0;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        const ctx = new AudioContextClass();
        sampleRate = ctx.sampleRate;
        ctx.close(); 
      }
    } catch (e) {
      console.warn("Could not determine sample rate for logger", e);
    }

    this.addLog('SYSTEM', 'Logger Initialized', { 
      userAgent: navigator.userAgent,
      screen: `${window.screen.width}x${window.screen.height}`,
      sampleRate: sampleRate
    });
  }

  private getFormattedTimestamp(): string {
    const now = new Date();
    const elapsed = Date.now() - this.stats.startTime;
    const timeStr = now.toISOString().split('T')[1].replace('Z', ''); 
    return `[${timeStr}] (+${(elapsed / 1000).toFixed(3)}s)`;
  }

  // Generic internal logger
  addLog(type: LogType, message: string, data?: any) {
    const entry: LogEntry = {
      timestamp: this.getFormattedTimestamp(),
      type,
      message,
      data: data ? (typeof data === 'object' ? JSON.stringify(data) : String(data)) : undefined
    };
    
    this.logs.push(entry);
    
    if (type === 'ERROR') {
      console.error(`[OHANASHI] ${message}`, data);
    } else if (type === 'CONNECTION' || type === 'STATE') {
      console.log(`[OHANASHI] ${message}`);
    }
  }

  // --- Specialized Logging Methods (Claude's Recommendations) ---

  logConnectionAttempt() {
    this.addLog('CONNECTION', 'Attempting WebSocket Connection...');
  }

  logConnectionOpen() {
    this.addLog('CONNECTION', 'WebSocket Open');
  }

  logAudioSend(sizeBytes: number, isSilence: boolean) {
    this.stats.bytesSent += sizeBytes;
    this.stats.lastSendTime = Date.now();
    // To reduce noise, maybe only log non-silence or periodic silence
    // But for debugging 1006, we log everything concisely
    const type = isSilence ? 'Heartbeat (Silence)' : 'Mic Input';
    // this.addLog('SEND', `${type} sent (${sizeBytes} bytes)`);
    // Keep it silent in console to avoid spam, but track in stats
  }

  logAudioReceive(sizeBytes: number) {
    this.stats.bytesReceived += sizeBytes;
    this.stats.lastReceiveTime = Date.now();
    this.addLog('RECV', `Audio Chunk Received (${sizeBytes} bytes)`);
  }

  logStateChange(newState: string) {
    if (this.stats.lastState !== newState) {
        this.addLog('STATE', `State changed: ${this.stats.lastState} -> ${newState}`);
        this.stats.lastState = newState;
        if (newState === 'SPEAKING') {
            this.stats.turnCount++;
        }
    }
  }

  logErrorContext(error: any, code?: number) {
    const now = Date.now();
    const idleDuration = now - this.stats.lastSendTime;
    
    const snapshot = {
        code: code || 'UNKNOWN',
        message: error?.message || String(error),
        uptime: `${((now - this.stats.startTime)/1000).toFixed(1)}s`,
        turnCount: this.stats.turnCount,
        bytesSent: this.stats.bytesSent,
        bytesReceived: this.stats.bytesReceived,
        msSinceLastSend: idleDuration,
        msSinceLastRecv: now - this.stats.lastReceiveTime,
        lastState: this.stats.lastState
    };

    this.addLog('ERROR', `Connection Failure (Code: ${code})`, snapshot);
    return snapshot;
  }

  exportLogs(): string {
    let output = `OHANASHI DEBUG LOG (ENHANCED)\nGenerated: ${new Date().toLocaleString()}\n`;
    output += `Session ID: ${this.stats.startTime}\n`;
    output += `Total Bytes Sent: ${this.stats.bytesSent}\n`;
    output += `Total Bytes Recv: ${this.stats.bytesReceived}\n`;
    output += `Total Turns: ${this.stats.turnCount}\n`;
    output += `==================================================\n\n`;

    this.logs.forEach(log => {
      const typeStr = `[${log.type}]`.padEnd(12, ' ');
      output += `${log.timestamp} ${typeStr} ${log.message}\n`;
      if (log.data) {
        output += `    >>> DATA: ${log.data}\n`;
      }
    });

    output += `\n==================================================\n`;
    output += `END OF LOG\n`;
    return output;
  }

  download() {
    try {
      const content = this.exportLogs();
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ohanashi-debug-${Date.now()}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Failed to download logs", e);
    }
  }
}