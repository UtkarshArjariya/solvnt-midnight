/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Keep the heavy WASM-bearing midnight packages out of the server-side
    // bundle so webpack doesn't try to resolve their package.json exports
    // through the strict server-default-last rule.
    serverComponentsExternalPackages: [
      '@midnight-ntwrk/compact-js',
      '@midnight-ntwrk/midnight-js-contracts',
      '@midnight-ntwrk/midnight-js-fetch-zk-config-provider',
      '@midnight-ntwrk/midnight-js-http-client-proof-provider',
      '@midnight-ntwrk/midnight-js-indexer-public-data-provider',
      '@midnight-ntwrk/midnight-js-level-private-state-provider',
      '@midnight-ntwrk/platform-js',
      '@midnight-ntwrk/compact-runtime',
      '@midnight-ntwrk/ledger-v8',
    ],
  },
  webpack: (config, { isServer }) => {
    // @midnight-ntwrk/ledger-v8 ships a WebAssembly module (BLS12-381,
    // serialization). Webpack 5 requires async WASM be opted in.
    config.experiments = {
      ...(config.experiments ?? {}),
      asyncWebAssembly: true,
      topLevelAwait: true,
    };
    // Several midnight-ntwrk packages reference `node:` builtins in their ESM
    // distributions even on the browser entry — short them out client-side so
    // the bundler doesn't try to resolve them.
    if (!isServer) {
      config.resolve.fallback = {
        ...(config.resolve.fallback ?? {}),
        fs: false,
        path: false,
        os: false,
        crypto: false,
        stream: false,
        buffer: false,
      };
    }
    return config;
  },
};

export default nextConfig;
