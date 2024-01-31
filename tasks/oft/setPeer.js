const LZ_ENDPOINTS = require("../../constants/lzEndpoints.json");

module.exports = async (taskArgs, hre) => {
    let signers = await ethers.getSigners();
    console.log(`current local signer: ${signers[0].address}`);

    const localContractInstance = await ethers.getContractAt("ASDOFT", taskArgs.localContract);

    const remoteEID = LZ_ENDPOINTS[taskArgs.remoteChain].id;

    // remote address in bytes format
    const remoteAddresBytes = new ethers.AbiCoder().encode(["address"], [taskArgs.remoteContract]);

    // check if already a peer
    const isPeer = await localContractInstance.isPeer(remoteEID, remoteAddresBytes);

    if (isPeer) {
        console.log(`already a peer`);
    } else {
        await (await localContractInstance.setPeer(remoteEID, remoteAddresBytes)).wait();
        console.log(`✅ [${hre.network.name}] setPeer(${taskArgs.remoteChain}, ${remoteEID})`);
    }
};
