/**
 * Categorized Render Command Queue with persistent zero-allocation buffers and in-place stable sorting.
 * Formally specified in docs/09_Canvas_Engine_Specification.md (Section 4 & 5).
 */

import { RenderLayer } from '../layer/layer-manager';
import { BoundingBox2D } from '../math/bounding-box';

export interface DrawCommand {
  readonly id: string;
  readonly layer: RenderLayer;
  readonly bounds?: BoundingBox2D;
  readonly execute: (ctx: CanvasRenderingContext2D) => void;
}

export class RenderQueue {
  private commands: Array<DrawCommand | undefined>;
  private count: number = 0;
  private isSorted: boolean = true;

  constructor(initialCapacity: number = 1024) {
    this.commands = new Array<DrawCommand | undefined>(initialCapacity);
  }

  public enqueue(command: DrawCommand): void {
    if (this.count >= this.commands.length) {
      // Expand buffer by 1.5x capacity
      const newCapacity = Math.ceil(this.commands.length * 1.5);
      const newArray = new Array<DrawCommand | undefined>(newCapacity);
      for (let i = 0; i < this.count; i++) {
        newArray[i] = this.commands[i];
      }
      this.commands = newArray;
    }

    this.commands[this.count] = command;
    this.count++;
    this.isSorted = false;
  }

  public getCount(): number {
    return this.count;
  }

  public getCapacity(): number {
    return this.commands.length;
  }

  /**
   * Internal inspection helper for memory retention unit tests.
   */
  public getInternalSlot(index: number): DrawCommand | undefined {
    return this.commands[index];
  }

  /**
   * Sorts draw commands in-place in strict ascending z-index layer order (Layer 0 to 10).
   * Stable in-place insertion sort eliminates all temporary array allocations on frame render hot path.
   */
  public sort(): void {
    if (this.isSorted || this.count <= 1) {
      this.isSorted = true;
      return;
    }

    // In-place stable insertion sort on active commands [0, this.count)
    for (let i = 1; i < this.count; i++) {
      const current = this.commands[i]!;
      let j = i - 1;

      while (j >= 0 && this.commands[j]!.layer > current.layer) {
        this.commands[j + 1] = this.commands[j];
        j--;
      }
      this.commands[j + 1] = current;
    }

    this.isSorted = true;
  }

  public getCommands(): ReadonlyArray<DrawCommand> {
    this.sort();
    const result: DrawCommand[] = new Array<DrawCommand>(this.count);
    for (let i = 0; i < this.count; i++) {
      result[i] = this.commands[i]!;
    }
    return result;
  }

  /**
   * Flushes and executes all queued draw commands onto target context with zero temporary array allocation.
   */
  public flush(ctx: CanvasRenderingContext2D): number {
    this.sort();
    const executedCount = this.count;

    for (let i = 0; i < executedCount; i++) {
      const cmd = this.commands[i]!;
      ctx.save();
      cmd.execute(ctx);
      ctx.restore();
    }

    this.clear();
    return executedCount;
  }

  /**
   * Resets active count to 0 and nulls inactive slots to prevent retaining stale closures.
   * Buffer capacity is preserved without releasing the array.
   */
  public clear(): void {
    for (let i = 0; i < this.count; i++) {
      this.commands[i] = undefined;
    }
    this.count = 0;
    this.isSorted = true;
  }
}
