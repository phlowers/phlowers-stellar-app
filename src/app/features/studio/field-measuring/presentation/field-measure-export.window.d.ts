/** Minimal File System Access API typings (not yet included in the configured DOM lib). */
interface FileSystemWritableFileStream {
  write(data: BufferSource | Blob | string): Promise<void>;
  close(): Promise<void>;
}

interface FileSystemFileHandle {
  createWritable(): Promise<FileSystemWritableFileStream>;
}

interface SaveFilePickerOptions {
  suggestedName?: string;
  types?: { description?: string; accept: Record<string, string[]> }[];
}

/**
 * Declared as a global `var` (not on `Window`) so it is reachable via `globalThis`, required by the
 * `no-restricted-globals` lint rule. Must use `var` (not `let`/`const`) for TypeScript to expose it
 * on the `typeof globalThis` type, matching real runtime script-scope semantics.
 */
// eslint-disable-next-line no-var
declare var showSaveFilePicker: ((options?: SaveFilePickerOptions) => Promise<FileSystemFileHandle>) | undefined;
