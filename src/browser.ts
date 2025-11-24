// src/browser.ts
/**
 * @file Browser Entrypoint
 * @description This file exposes the core compiler and VM functionalities
 * to be used in a browser environment. It will be bundled into a single
 * JS file for the frontend.
 */

import { compile } from './lang/compiler';
import { VirtualMachine } from './core/vm/virtual-machine';

// Expose functions to the global window object so the inline script
// in index.html can access them.
(window as any).eternity = {
  compile,
  VirtualMachine,
};
