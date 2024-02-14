require("dotenv").config();
require("@nomicfoundation/hardhat-toolbox");
require("hardhat-gas-reporter");

require("./tasks");

function getAccount() {
    return process.env.PRIVATE_KEY ?? "";
}

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
    solidity: {
        compilers: [
            {
                version: "0.8.22",
                settings: {
                    optimizer: {
                        enabled: true,
                        runs: 200,
                    },
                },
            },
        ],
    },

    gasReporter: {
        enabled: true,
        src: "./contracts",
    },

    networks: {
        canto: {
            url: "https://canto-rpc.ansybl.io/",
            chainId: 7700,
            accounts: [getAccount()],
        },
        arbitrum: {
            url: "https://arb1.arbitrum.io/rpc",
            chainId: 42161,
            accounts: [getAccount()],
        },
        "canto-testnet": {
            url: `https://canto-testnet.plexnode.wtf`,
            chainId: 7701,
            accounts: [getAccount()],
        },
        mumbai: {
            url: "https://rpc-mumbai.maticvigil.com/",
            chainId: 80001,
            accounts: [getAccount()],
        },
        "fantom-testnet": {
            url: "https://rpc.testnet.fantom.network",
            chainId: 4002,
            accounts: [getAccount()],
        },
    },
};
