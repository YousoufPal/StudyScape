// net-mock.js
// This is a very basic mock. It's unlikely to make WebSockets fully work
// if 'net' is truly required, but it might get past the import error.
export function connect() {
  console.warn("net.connect mock called - THIS IS A MOCK AND LIKELY WON'T WORK FOR REAL WEBSOCKETS");
  const Emitter = require('events'); // Use 'events' polyfill if available
  const emitter = new Emitter();
  // Simulate async connection and immediate close/error for testing
  setTimeout(() => emitter.emit('error', new Error('Mock net connection failed')), 100);
  return emitter;
}
export function createServer() {
  console.warn("net.createServer mock called - THIS IS A MOCK");
  return { listen: () => {}, on: () => {}, close: () => {} };
}
const Socket = function() {
  console.warn("net.Socket mock constructor called - THIS IS A MOCK");
  const Emitter = require('events');
  Object.assign(this, new Emitter());
  this.connect = connect;
  this.write = () => { console.warn("Mock Socket.write"); };
  this.end = () => { console.warn("Mock Socket.end"); };
  this.destroy = () => { console.warn("Mock Socket.destroy"); };
  this.setKeepAlive = () => {};
  this.setNoDelay = () => {};
  // Add other methods that might be called on a net.Socket instance
};
export default { connect, createServer, Socket };