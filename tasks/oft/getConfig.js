const LZ_ENDPOINTS = require("../../constants/lzEndpoints.json");
const { decodeLzConfig } = require("../taskHelpers");

module.exports = async (taskArgs, hre) => {
    // get endpoint contract instance
    const lzEndpoint = await ethers.getContractAt("IMessageLibManager", LZ_ENDPOINTS[hre.network.name].endpoint);

    const oapp = taskArgs.localContract;

    const abiCoder = new ethers.AbiCoder();
    console.log(
        abiCoder.decode(
            ["tuple(uint64,uint16,uint128,uint128)"],
            "0x0000000000000000000000000000000000000000000000000000000000014c08000000000000000000000000000000000000000000000000000000000000290400000000000000000000000000000000000000000000000ad78ebc5ac62000000000000000000000000000000000000000000000000000000354a6ba7a180000"
        )
    );

    const remoteChains = taskArgs.remoteChains.split(",");
    for (const chain of remoteChains) {
        const eid = LZ_ENDPOINTS[chain].id;

        const sendLib = await lzEndpoint.defaultSendLibrary(eid);
        const decodedSendConfig = decodeLzConfig(await lzEndpoint.getConfig(oapp, sendLib, eid, 2));
        console.log(`chain: ${chain} SEND config: \n`);
        console.log(decodedSendConfig);

        const receiveLib = await lzEndpoint.defaultReceiveLibrary(eid);
        const decodedReceiveConfig = decodeLzConfig(await lzEndpoint.getConfig(oapp, receiveLib, eid, 2));
        console.log(`chain: ${chain} RECEIVE config: \n`);
        console.log(decodedReceiveConfig);
    }
};

// struct UlnConfig {
//     uint64 confirmations;
//     // we store the length of required DVNs and optional DVNs instead of using DVN.length directly to save gas
//     uint8 requiredDVNCount; // 0 indicate DEFAULT, NIL_DVN_COUNT indicate NONE (to override the value of default)
//     uint8 optionalDVNCount; // 0 indicate DEFAULT, NIL_DVN_COUNT indicate NONE (to override the value of default)
//     uint8 optionalDVNThreshold; // (0, optionalDVNCount]
//     address[] requiredDVNs; // no duplicates. sorted an an ascending order. allowed overlap with optionalDVNs
//     address[] optionalDVNs; // no duplicates. sorted an an ascending order. allowed overlap with requiredDVNs
// }
