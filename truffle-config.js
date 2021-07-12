const HDWalletProvider = require('@truffle/hdwallet-provider');

module.exports = {
  networks: {
    development: {
      host: '127.0.0.1',
      port: 8545,
      network_id: '*',
    },
    ropsten: {
      provider: () =>
        new HDWalletProvider(
          process.env.mnemonic,
          `https://ropsten.infura.io/v3/${process.env.infuraKey}`,
        ),
      network_id: 3,
      gas: 5500000,
      confirmations: 2,
      timeoutBlocks: 200,
      skipDryRun: true,
    },
  },
  plugins: ['truffle-plugin-verify', 'solidity-coverage'],
  compilers: {
    solc: {
      version: '^0.8.0',
      settings: {
        optimizer: {
          enabled: true,
          runs: 200,
        },
      },
    },
  },
};
