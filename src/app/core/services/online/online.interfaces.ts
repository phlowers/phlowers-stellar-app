/**
 * Enumeration of possible server connection states.
 *
 * @category Types
 */
export enum ServerStatus {
  /** Server status is being determined */
  LOADING = 'LOADING',
  /** Server is reachable and responding */
  ONLINE = 'ONLINE',
  /** Server is not reachable */
  OFFLINE = 'OFFLINE'
}
