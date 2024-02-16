const { cli } = require("cli-ux");
const { ethers } = require("ethers");

async function promptToProceed(msg) {
    const proceed = await cli.prompt(`${msg} y/N`);
    return ["y", "yes"].includes(proceed.toLowerCase());
}

function decodeLzConfig(configBytes) {
    const abiCoder = new ethers.AbiCoder();
    const decodedConfig = abiCoder.decode(["tuple(uint64, uint8, uint8, uint8, address[], address[])"], configBytes);
    const [confirmations, requiredDVNCount, optionalDVNCount, optionalDVNThreshold, requiredDVNs, optionalDVNs] = decodedConfig[0];
    return {
        confirmations,
        requiredDVNCount,
        optionalDVNCount,
        optionalDVNThreshold,
        requiredDVNs,
        optionalDVNs,
    };
}

function encodeLzConfig(confirmations, requiredDVNCount, optionalDVNCount, optionalDVNThreshold, requiredDVNs, optionalDVNs) {
    const abiCoder = new ethers.AbiCoder();
    return abiCoder.encode(
        ["tuple(uint64, uint8, uint8, uint8, address[], address[])"],
        [[confirmations, requiredDVNCount, optionalDVNCount, optionalDVNThreshold, requiredDVNs, optionalDVNs]]
    );
}

module.exports = {
    promptToProceed,
    encodeLzConfig,
    decodeLzConfig,
};
