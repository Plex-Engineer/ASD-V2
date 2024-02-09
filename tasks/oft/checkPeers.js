const LZ_ENDPOINTS = require("../../constants/lzEndpoints.json");

// enter your remote addresses here to check if they are peers
const remoteAddresses = {
    ["canto-testnet"]: "0xa5bFA7E06eBc71Ca3cc58f5AC0954ebf6E9890E5",
    mumbai: "0xCE979fB0Bf2CD70F4C44b9f0DBc97aBAe336A331",
    ["fantom-testnet"]: "0xE344Ff497C293d7b768Ef03dcfF7fF0B4EF494d2",
};
module.exports = async (taskArgs, hre) => {
    const localContractInstance = await ethers.getContractAt("ASDOFT", remoteAddresses[hre.network.name]);

    await Promise.all(
        Object.entries(remoteAddresses).map(async ([remoteChain, remoteAddress]) => {
            if (hre.network.name !== remoteChain) {
                const remoteEID = LZ_ENDPOINTS[remoteChain].id;
                const remoteAddresBytes = new ethers.AbiCoder().encode(["address"], [remoteAddress]);

                const isPeer = await localContractInstance.isPeer(remoteEID, remoteAddresBytes);

                console.log(`[${remoteChain}]: ${isPeer ? "✅" : "❌"}`);
            }
        })
    );
};
