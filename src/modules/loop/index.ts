import { EventEmitter } from 'node:events';
import pino from 'pino';
import type { VaultConfig, CognitiveLoopStatus } from '../../types/config.js';
import type { Task } from '../../types/task.js';
import { TaskState } from '../../types/enums.js';
import { VaultWatcher, createWatcher } from './watcher.js';
import { processTask, StateChangeHandler } from './processor.js';
import * as taskModule from '../task/index.js';

// Re-export machine types
export { cognitiveLoopMachine, mapToTaskState, mapFromTaskState } from './machine.js';
export type { CognitiveLoopContext, CognitiveLoopEvent } from './machine.js';

// Re-export watcher
export { VaultWatcher, createWatcher } from './watcher.js';
export type { WatcherEvents } from './watcher.js';

// Re-export processor
export { processTask, processTaskWithApproval } from './processor.js';
export type { ProcessorResult, StateChangeHandler } from './processor.js';

/**
 * Cognitive loop event types
 */
export interface CognitiveLoopEvents {
  'task:created': (task: Task) => void;
  'task:stateChanged': (taskId: string, from: TaskState | null, to: TaskState) => void;
  'task:completed': (taskId: string, success: boolean) => void;
  'task:error': (taskId: string, error: string) => void;
  'loop:started': () => void;
  'loop:stopped': (graceful: boolean) => void;
  'approval:required': (taskId: string, planPath: string) => void;
  'approval:received': (taskId: string, approved: boolean) => void;
}

/**
 * Typed event emitter for loop events
 */
export class LoopEventEmitter extends EventEmitter {
  emit<K extends keyof CognitiveLoopEvents>(
    event: K,
    ...args: Parameters<CognitiveLoopEvents[K]>
  ): boolean {
    return super.emit(event, ...args);
  }

  on<K extends keyof CognitiveLoopEvents>(
    event: K,
    listener: CognitiveLoopEvents[K]
  ): this {
    return super.on(event, listener);
  }
}

/**
 * Cognitive Loop Orchestrator
 * Main controller for the cognitive loop system
 */
export class CognitiveLoop {
  private config: VaultConfig;
  private watcher: VaultWatcher | null = null;
  private events: LoopEventEmitter;
  private logger: pino.Logger;
  private running = false;
  private startTime: Date | null = null;
  private tasksInProgress = new Set<string>();
  private lastProcessed: string = new Date().toISOString();

  constructor(config: VaultConfig, logger?: pino.Logger) {
    this.config = config;
    this.events = new LoopEventEmitter();
    this.logger = logger || pino({ level: 'info' });
  }

  /**
   * Start the cognitive loop
   */
  async start(): Promise<void> {
    if (this.running) {
      throw new Error('Cognitive loop is already running');
    }

    this.logger.info('Starting cognitive loop...');

    // Create and start watcher
    this.watcher = createWatcher(this.config);
    const watcherEvents = this.watcher.getEvents();

    // Handle new tasks
    watcherEvents.on('task:new', async (filePath) => {
      this.logger.info({ filePath }, 'New task detected');
      await this.handleNewTask(filePath);
    });

    // Handle approval events
    watcherEvents.on('plan:approved', async (filePath) => {
      this.logger.info({ filePath }, 'Plan approved');
      // Extract task ID from filename and emit event
      const taskId = this.extractTaskIdFromPath(filePath);
      if (taskId) {
        this.events.emit('approval:received', taskId, true);
      }
    });

    watcherEvents.on('plan:rejected', async (filePath) => {
      this.logger.info({ filePath }, 'Plan rejected');
      const taskId = this.extractTaskIdFromPath(filePath);
      if (taskId) {
        this.events.emit('approval:received', taskId, false);
      }
    });

    // Handle watcher errors
    watcherEvents.on('watcher:error', (error) => {
      this.logger.error({ error }, 'Watcher error');
    });

    // Start watching
    await this.watcher.start();

    this.running = true;
    this.startTime = new Date();
    this.events.emit('loop:started');
    this.logger.info('Cognitive loop started');

    // Process any existing tasks in queue
    await this.processExistingTasks();
  }

  /**
   * Stop the cognitive loop
   */
  async stop(timeout = 30000): Promise<void> {
    if (!this.running) {
      return;
    }

    this.logger.info('Stopping cognitive loop...');

    // Wait for in-progress tasks (with timeout)
    const startWait = Date.now();
    while (this.tasksInProgress.size > 0 && Date.now() - startWait < timeout) {
      this.logger.info(
        { count: this.tasksInProgress.size },
        'Waiting for in-progress tasks...'
      );
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    const graceful = this.tasksInProgress.size === 0;

    // Stop watcher
    if (this.watcher) {
      await this.watcher.stop();
      this.watcher = null;
    }

    this.running = false;
    this.startTime = null;
    this.events.emit('loop:stopped', graceful);
    this.logger.info({ graceful }, 'Cognitive loop stopped');
  }

  /**
   * Get loop status
   */
  getStatus(): CognitiveLoopStatus {
    const uptimeSeconds = this.startTime
      ? Math.floor((Date.now() - this.startTime.getTime()) / 1000)
      : 0;

    return {
      running: this.running,
      tasks_in_progress: this.tasksInProgress.size,
      tasks_waiting_approval: 0, // TODO: Track this
      last_processed: this.lastProcessed,
      uptime_seconds: uptimeSeconds,
    };
  }

  /**
   * Get event emitter for subscribing to events
   */
  getEvents(): LoopEventEmitter {
    return this.events;
  }

  /**
   * Subscribe to state changes
   */
  onStateChange(callback: StateChangeHandler): void {
    this.events.on('task:stateChanged', callback);
  }

  /**
   * Check if loop is running
   */
  isRunning(): boolean {
    return this.running;
  }

  /**
   * Handle a new task file
   */
  private async handleNewTask(filePath: string): Promise<void> {
    try {
      // Parse task from file
      const task = await taskModule.createFromFile(filePath, this.config);
      this.events.emit('task:created', task);

      // Process the task
      await this.processTaskInternal(task);
    } catch (error) {
      this.logger.error({ error, filePath }, 'Failed to handle new task');
    }
  }

  /**
   * Process a task through the cognitive loop
   */
  private async processTaskInternal(task: Task): Promise<void> {
    this.tasksInProgress.add(task.id);

    try {
      const result = await processTask(task, this.config, (taskId, from, to) => {
        this.events.emit('task:stateChanged', taskId, from, to);
      });

      this.lastProcessed = new Date().toISOString();
      this.events.emit('task:completed', task.id, result.success);

      if (!result.success && result.error) {
        this.events.emit('task:error', task.id, result.error);
      }
    } finally {
      this.tasksInProgress.delete(task.id);
    }
  }

  /**
   * Process any existing tasks in the queue
   */
  private async processExistingTasks(): Promise<void> {
    const tasks = await taskModule.listActive(this.config);
    this.logger.info({ count: tasks.length }, 'Processing existing tasks');

    for (const task of tasks) {
      if (task.current_state !== TaskState.CLOSE) {
        await this.processTaskInternal(task);
      }
    }
  }

  /**
   * Extract task ID from a file path
   */
  private extractTaskIdFromPath(filePath: string): string | null {
    // Try to extract UUID from path (task_<uuid>_*.md or <uuid>-plan.md)
    const uuidRegex = /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i;
    const shortIdRegex = /(?:task_)?([0-9a-f]{8})/i;

    const fullMatch = uuidRegex.exec(filePath);
    if (fullMatch) {
      return fullMatch[1];
    }

    const shortMatch = shortIdRegex.exec(filePath);
    if (shortMatch) {
      return shortMatch[1];
    }

    return null;
  }
}

/**
 * Create a cognitive loop instance
 */
export function createLoop(
  config: VaultConfig,
  logger?: pino.Logger
): CognitiveLoop {
  return new CognitiveLoop(config, logger);
}
