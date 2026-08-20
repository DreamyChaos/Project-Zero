/**
 * Strongly typed Canvas Pointer Event abstraction.
 * Supports Mouse, Touch, and Pen/Stylus inputs.
 * Formally specified in docs/09_Canvas_Engine_Specification.md (Section 13).
 */

import { Point2D } from '../math/point2d';

export type PointerType = 'mouse' | 'touch' | 'pen';

export interface CanvasPointerEvent {
  readonly pointerId: number;
  readonly pointerType: PointerType;
  readonly clientX: number;
  readonly clientY: number;
  readonly screenX: number;
  readonly screenY: number;
  readonly worldPoint: Point2D;
  readonly screenPoint: Point2D;
  readonly pressure: number;
  readonly button: number; // 0: Main/Left, 1: Auxiliary/Middle, 2: Secondary/Right
  readonly buttons: number;
  readonly altKey: boolean;
  readonly ctrlKey: boolean;
  readonly shiftKey: boolean;
  readonly metaKey: boolean;
}

export function createCanvasPointerEvent(
  rawEvent: MouseEvent | PointerEvent | TouchEvent,
  screenPoint: Point2D,
  worldPoint: Point2D
): CanvasPointerEvent {
  let pointerId = 1;
  let pointerType: PointerType = 'mouse';
  let pressure = 0.5;
  let button = 0;
  let buttons = 1;
  let clientX = 0;
  let clientY = 0;
  let screenX = 0;
  let screenY = 0;

  if (typeof TouchEvent !== 'undefined' && rawEvent instanceof TouchEvent) {
    pointerType = 'touch';
    if (rawEvent.touches.length > 0) {
      const touch = rawEvent.touches[0];
      pointerId = touch.identifier;
      clientX = touch.clientX;
      clientY = touch.clientY;
      screenX = touch.screenX;
      screenY = touch.screenY;
    } else if (rawEvent.changedTouches.length > 0) {
      const touch = rawEvent.changedTouches[0];
      pointerId = touch.identifier;
      clientX = touch.clientX;
      clientY = touch.clientY;
      screenX = touch.screenX;
      screenY = touch.screenY;
    }
    button = 0;
    buttons = rawEvent.touches.length > 0 ? 1 : 0;
    pressure = 1.0;
  } else if (rawEvent && typeof rawEvent === 'object') {
    clientX = (rawEvent as MouseEvent).clientX ?? 0;
    clientY = (rawEvent as MouseEvent).clientY ?? 0;
    screenX = (rawEvent as MouseEvent).screenX ?? clientX;
    screenY = (rawEvent as MouseEvent).screenY ?? clientY;
    button = (rawEvent as MouseEvent).button ?? 0;
    buttons = (rawEvent as MouseEvent).buttons ?? (rawEvent.type === 'pointerdown' || rawEvent.type === 'mousedown' ? 1 : 0);

    if (typeof PointerEvent !== 'undefined' && rawEvent instanceof PointerEvent) {
      pointerId = rawEvent.pointerId;
      if (rawEvent.pointerType === 'touch' || rawEvent.pointerType === 'pen' || rawEvent.pointerType === 'mouse') {
        pointerType = rawEvent.pointerType;
      }
      pressure = rawEvent.pressure;
    }
  }

  return {
    pointerId,
    pointerType,
    clientX,
    clientY,
    screenX,
    screenY,
    worldPoint,
    screenPoint,
    pressure,
    button,
    buttons,
    altKey: Boolean(rawEvent.altKey),
    ctrlKey: Boolean(rawEvent.ctrlKey),
    shiftKey: Boolean(rawEvent.shiftKey),
    metaKey: Boolean(rawEvent.metaKey),
  };
}
