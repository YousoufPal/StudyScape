// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver = config.resolver || {};
config.resolver.extraNodeModules = config.resolver.extraNodeModules || {};

// --- Essential Polyfills for Node.js core modules often used by 'ws' ---
config.resolver.extraNodeModules.stream = require.resolve('readable-stream');
config.resolver.extraNodeModules.buffer = require.resolve('buffer/');
config.resolver.extraNodeModules.http = require.resolve('stream-http');
config.resolver.extraNodeModules.https = require.resolve('https-browserify');
config.resolver.extraNodeModules.url = require.resolve('url/');
config.resolver.extraNodeModules.assert = require.resolve('assert/');
config.resolver.extraNodeModules.crypto = require.resolve('react-native-get-random-values');
config.resolver.extraNodeModules.events = require.resolve('events/');
config.resolver.extraNodeModules.zlib = require.resolve('browserify-zlib');

// --- Mocks for very Node-specific modules that are hard to polyfill ---
// Create 'empty-mock.js' in your project root with content: module.exports = {};
// Create 'net-mock.js' in your project root (content provided previously)

let emptyMockPath;
try {
    emptyMockPath = require.resolve('./empty-mock.js');
} catch (e) {
    console.error("CRITICAL: 'empty-mock.js' not found in project root. Please create it with 'module.exports = {};'. Build will likely fail.");
    // Provide a dummy path or let it crash to ensure this is fixed.
    // Forcing a crash is better than a silent misconfiguration.
    throw new Error("Missing empty-mock.js in project root. This is required for polyfilling 'net', 'tls', etc.");
}

let netMockPath;
try {
    netMockPath = require.resolve('./net-mock.js');
} catch (e) {
    console.warn("Could not resolve './net-mock.js'. The 'net' module will use an empty mock. This might break WebSocket functionality if 'net' is critically used by 'ws'.");
    netMockPath = emptyMockPath; // Fallback to empty mock if net-mock.js is not present
}

config.resolver.extraNodeModules.net = netMockPath;
config.resolver.extraNodeModules.tls = emptyMockPath; // <-- ADDED/CONFIRMED THIS LINE
config.resolver.extraNodeModules.dgram = emptyMockPath;
config.resolver.extraNodeModules.fs = emptyMockPath;

// console.log('Metro extraNodeModules:', JSON.stringify(config.resolver.extraNodeModules, null, 2));

module.exports = config;