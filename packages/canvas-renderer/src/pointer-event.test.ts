import { describe, it, expect } from 'vitest';
import { createCanvasPointerEvent } from './interaction/pointer-event';

describe('CanvasPointerEvent & Factory', () => {
  it('creates strongly typed pointer event from standard MouseEvent', () => {
    const mouseEvent = {
      clientX: 100,
      clientY: 150,
      screenX: 100,
      screenY: 150,
      button: 0,
      buttons: 1,
      altKey: true,
      ctrlKey: false,
      shiftKey: true,
      metaKey: false,
      type: 'mousedown',
    } as unknown as MouseEvent;

    const screenPoint = { x: 100, y: 150 };
    const worldPoint = { x: 50, y: 75 };

    const event = createCanvasPointerEvent(mouseEvent, screenPoint, worldPoint);

    expect(event.pointerType).toBe('mouse');
    expect(event.clientX).toBe(100);
    expect(event.clientY).toBe(150);
    expect(event.screenPoint).toEqual(screenPoint);
    expect(event.worldPoint).toEqual(worldPoint);
    expect(event.altKey).toBe(true);
    expect(event.shiftKey).toBe(true);
    expect(event.ctrlKey).toBe(false);
    expect(event.metaKey).toBe(false);
  });

  it('creates strongly typed pointer event from TouchEvent', () => {
    const touchEvent = {
      touches: [
        {
          identifier: 42,
          clientX: 200,
          clientY: 250,
          screenX: 200,
          screenY: 250,
        },
      ],
      changedTouches: [],
      altKey: false,
      ctrlKey: false,
      shiftKey: false,
      metaKey: false,
    } as unknown as TouchEvent;

    const originalTouchEvent = globalThis.TouchEvent;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as unknown as { TouchEvent: unknown }).TouchEvent = class TouchEventMock {};

    try {
      Object.setPrototypeOf(touchEvent, (globalThis as unknown as { TouchEvent: { prototype: object } }).TouchEvent.prototype);
      const event = createCanvasPointerEvent(touchEvent, { x: 200, y: 250 }, { x: 100, y: 125 });

      expect(event.pointerType).toBe('touch');
      expect(event.pointerId).toBe(42);
      expect(event.clientX).toBe(200);
      expect(event.clientY).toBe(250);
    } finally {
      (globalThis as unknown as { TouchEvent: unknown }).TouchEvent = originalTouchEvent;
    }
  });

  it('creates strongly typed pointer event from Stylus/Pen PointerEvent', () => {
    const pointerEvent = {
      pointerId: 7,
      pointerType: 'pen',
      clientX: 300,
      clientY: 350,
      screenX: 300,
      screenY: 350,
      pressure: 0.85,
      button: 0,
      buttons: 1,
      altKey: false,
      ctrlKey: true,
      shiftKey: false,
      metaKey: false,
    } as unknown as PointerEvent;

    const originalPointerEvent = globalThis.PointerEvent;
    (globalThis as unknown as { PointerEvent: unknown }).PointerEvent = class PointerEventMock {};

    try {
      Object.setPrototypeOf(pointerEvent, (globalThis as unknown as { PointerEvent: { prototype: object } }).PointerEvent.prototype);
      const event = createCanvasPointerEvent(pointerEvent, { x: 300, y: 350 }, { x: 150, y: 175 });

      expect(event.pointerType).toBe('pen');
      expect(event.pointerId).toBe(7);
      expect(event.pressure).toBe(0.85);
      expect(event.ctrlKey).toBe(true);
    } finally {
      (globalThis as unknown as { PointerEvent: unknown }).PointerEvent = originalPointerEvent;
    }
  });
});
