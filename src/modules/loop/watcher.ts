import chokidar, { FSWatcher } from 'chokidar';
import { EventEmitter } from 'node:events';
import { basename } from 'node:path';
import type { VaultConfig } from '../../types/config.js';

/**
 * Events emitted by the vault watcher
 */
export interface WatcherEvents {
  /** New task file detected in Needs_Action */
  'task:new': (filePath: string) => void;
  /** Task file modified */
  'task:changed': (filePath: string) => void;
  /** Task file deleted */
  'task:deleted': (filePath: string) => void;
  /** Plan moved to approved folder */
  'plan:approved': (filePath: string) => void;
  /** Plan moved to rejected folder */
  'plan:rejected': (filePath: string) => void;
  /** Error report created */
  'error:new': (filePath: string) => void;
  /** Watcher error */
  'watcher:error': (error: Error) => void;
  /** Watcher ready */
  'watcher:ready': () => void;
}

/**
 * Typed event emitter for watcher
 */
export class WatcherEventEmitter extends EventEmitter {
  emit<K extends keyof WatcherEvents>(
    event: K,
    ...args: Parameters<WatcherEvents[K]>
  ): boolean {
    return super.emit(event, ...args);
  }

  on<K extends keyof WatcherEvents>(
    event: K,
    listener: WatcherEvents[K]
  ): this {
    return super.on(event, listener);
  }

  off<K extends keyof WatcherEvents>(
    event: K,
    listener: WatcherEvents[K]
  ): this {
    return super.off(event, listener);
  }
}

/**
 * Vault file watcher
 * Monitors key directories for file changes
 */
export class VaultWatcher {
  private config: VaultConfig;
  private watcher: FSWatcher | null = null;
  private events: WatcherEventEmitter;
  private isReady = false;

  constructor(config: VaultConfig) {
    this.config = config;
    this.events = new WatcherEventEmitter();
  }

  /**
   * Start watching vault directories
   */
  async start(): Promise<void> {
    if (this.watcher) {
      throw new Error('Watcher already running');
    }

    const { directories } = this.config;

    // Directories to watch
    const watchPaths = [
      directories.needs_action,
      directories.plans_pending,
      directories.plans_approved,
      directories.plans_rejected,
    ];

    this.watcher = chokidar.watch(watchPaths, {
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 500,
        pollInterval: 100,
      },
      // Only watch .md files
      ignored: (path: string) => {
        // Allow directories
        if (!path.includes('.')) return false;
        // Only allow .md files
        return !path.toLowerCase().endsWith('.md');
      },
    });

    // Set up event handlers
    this.watcher
      .on('add', (path) => this.handleFileAdd(path))
      .on('change', (path) => this.handleFileChange(path))
      .on('unlink', (path) => this.handleFileDelete(path))
      .on('error', (error) => this.events.emit('watcher:error', error))
      .on('ready', () => {
        this.isReady = true;
        this.events.emit('watcher:ready');
      });
  }

  /**
   * Stop watching
   */
  async stop(): Promise<void> {
    if (this.watcher) {
      await this.watcher.close();
      this.watcher = null;
      this.isReady = false;
    }
  }

  /**
   * Get event emitter for subscribing to events
   */
  getEvents(): WatcherEventEmitter {
    return this.events;
  }

  /**
   * Check if watcher is running and ready
   */
  isRunning(): boolean {
    return this.watcher !== null && this.isReady;
  }

  /**
   * Handle file addition
   */
  private handleFileAdd(filePath: string): void {
    const fileName = basename(filePath);
    const { directories } = this.config;

    // Check which directory the file is in
    if (filePath.startsWith(directories.needs_action)) {
      if (fileName.startsWith('ERROR_')) {
        this.events.emit('error:new', filePath);
      } else {
        this.events.emit('task:new', filePath);
      }
    } else if (filePath.startsWith(directories.plans_approved)) {
      this.events.emit('plan:approved', filePath);
    } else if (filePath.startsWith(directories.plans_rejected)) {
      this.events.emit('plan:rejected', filePath);
    }
  }

  /**
   * Handle file modification
   */
  private handleFileChange(filePath: string): void {
    const { directories } = this.config;

    if (filePath.startsWith(directories.needs_action)) {
      const fileName = basename(filePath);
      if (!fileName.startsWith('ERROR_')) {
        this.events.emit('task:changed', filePath);
      }
    }
  }

  /**
   * Handle file deletion
   */
  private handleFileDelete(filePath: string): void {
    const { directories } = this.config;

    if (filePath.startsWith(directories.needs_action)) {
      const fileName = basename(filePath);
      if (!fileName.startsWith('ERROR_')) {
        this.events.emit('task:deleted', filePath);
      }
    }
  }
}

/**
 * Create a watcher instance
 */
export function createWatcher(config: VaultConfig): VaultWatcher {
  return new VaultWatcher(config);
}
