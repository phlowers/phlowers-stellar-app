/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { loadPyodide } from 'pyodide';
import { handleTask } from './tasks/handle-task';
// import importScript from './python-functions/imports.py';
import pythonPackages from './python-packages.json';

// Mock dependencies
jest.mock('pyodide', () => ({
  loadPyodide: jest.fn()
}));

jest.mock('./tasks/handle-task', () => ({
  handleTask: jest.fn()
}));

// Mock the Worker environment
const mockPostMessage = jest.fn();
const mockAddEventListener = jest.fn();
const mockPerformance = {
  now: jest.fn()
};

// Setup global objects to simulate web worker environment
Object.defineProperty(global, 'self', {
  value: {
    name: 'test/',
    postMessage: mockPostMessage,
    addEventListener: mockAddEventListener
  },
  writable: true
});

Object.defineProperty(global, 'postMessage', {
  value: mockPostMessage,
  writable: true
});

Object.defineProperty(global, 'addEventListener', {
  value: mockAddEventListener,
  writable: true
});

Object.defineProperty(global, 'performance', {
  value: mockPerformance,
  writable: true
});

describe('Worker', () => {
  let mockPyodide: any;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();

    // Setup performance.now mock to return incremental values
    let timeCounter = 0;
    mockPerformance.now.mockImplementation(() => {
      timeCounter += 100;
      return timeCounter;
    });

    // Setup mock Pyodide instance
    mockPyodide = {
      runPython: jest.fn().mockResolvedValue(undefined)
    };

    (loadPyodide as jest.Mock).mockResolvedValue(mockPyodide);
    (handleTask as jest.Mock).mockResolvedValue({ result: 'success' });
  });

  describe('loadPyodideAndPackages', () => {
    it('should load Pyodide with correct configuration', async () => {
      // Import the worker to trigger the initialization
      await import('./worker-python');

      // Verify loadPyodide was called with correct parameters
      expect(loadPyodide).toHaveBeenCalledWith({
        indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.27.4/full',
        packages: expect.arrayContaining([
          'scipy',
          'numpy',
          'pandas',
          'pydantic',
          'packaging',
          'wrapt'
        ])
      });

      // Verify local packages are included
      const localPackages = Object.values(pythonPackages)
        .filter((pkg: any) => pkg.source === 'local')
        .map((pkg: any) => 'test/pyodide/' + pkg.file_name);

      const callArgs = (loadPyodide as jest.Mock).mock.calls[0][0];
      expect(callArgs.packages).toEqual(expect.arrayContaining(localPackages));
    });

    // it('should post load time message after Pyodide loads', async () => {
    //   await import('./worker');
    //   await new Promise((resolve) => setTimeout(resolve, 1000));

    //   // First postMessage should be the load time
    //   expect(mockPostMessage).toHaveBeenCalledWith({ loadTime: expect.any(Number) });
    // });

    // it('should run Python import script', async () => {
    //   await import('./worker');

    //   // Verify runPython was called with the import script
    //   expect(mockPyodide.runPython).toHaveBeenCalledWith(importScript);
    // });

    // it('should post import time message after imports complete', async () => {
    //   await import('./worker');

    //   // Second postMessage should be the import time
    //   expect(mockPostMessage).toHaveBeenCalledWith({ importTime: expect.any(Number) });
    // });
  });

  // describe('message event listener', () => {
  //   it('should register a message event listener', async () => {
  //     await import('./worker');

  //     expect(addEventListener).toHaveBeenCalledWith('message', expect.any(Function));
  //   });

  //   it('should handle incoming messages and process tasks', async () => {
  //     await import('./worker');

  //     // Get the message handler function
  //     const messageHandler = mockAddEventListener.mock.calls[0][1];

  //     // Create a mock message event
  //     const mockData = {
  //       task: 'testTask',
  //       data: { param1: 'value1' }
  //     };

  //     // Call the message handler
  //     await messageHandler({ data: mockData });

  //     // Verify handleTask was called with correct parameters
  //     expect(handleTask).toHaveBeenCalledWith(mockPyodide, 'testTask', { param1: 'value1' });

  //     // Verify result was posted back
  //     expect(mockPostMessage).toHaveBeenCalledWith({ result: 'success' });
  //   });
  // });
});
