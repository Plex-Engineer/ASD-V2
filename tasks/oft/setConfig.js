const LZ_ENDPOINTS = require("../../constants/lzEndpoints.json");
const { decodeLzConfig, encodeLzConfig } = require("../taskHelpers");

const DVNS = {
    canto: "0x1BAcC2205312534375c8d1801C27D28370656cFf",
    arbitrum: "0x2f55C492897526677C5B68fb199ea31E2c126416",
};
const CONFIG_TYPE = 2;

module.exports = async (taskArgs, hre) => {
    // get signer (must be owner of the OFT contract)
    let signers = await ethers.getSigners();
    console.log(`current local signer: ${signers[0].address}`);

    const lzEndpoint = await ethers.getContractAt("IMessageLibManager", LZ_ENDPOINTS[hre.network.name].endpoint);
    const oapp = taskArgs.localContract;
    const dvn = DVNS[hre.network.name];
    // will call setConfig on endpoint with oapp, lib, and the config[]
    // config will be an array of setConfigParams
    const remoteChains = taskArgs.remoteChains.split(",");

    await Promise.all(
        remoteChains.map(async (chain) => {
            // we will just use the current default config and just add the required dvns
            const eid = LZ_ENDPOINTS[chain].id;

            const sendLib = await lzEndpoint.defaultSendLibrary(eid);
            const decodedSendConfig = decodeLzConfig(await lzEndpoint.getConfig(oapp, sendLib, eid, CONFIG_TYPE));
            const sendConfigParams = [
                eid,
                CONFIG_TYPE,
                encodeLzConfig(
                    decodedSendConfig.confirmations,
                    decodedSendConfig.requiredDVNCount,
                    decodedSendConfig.optionalDVNCount,
                    decodedSendConfig.optionalDVNThreshold,
                    [dvn],
                    decodedSendConfig.optionalDVNs
                ),
            ];
            // set the send lib config for this path
            console.log(`setting send config for ${chain}`);
            await lzEndpoint.setConfig(oapp, sendLib, [sendConfigParams]);

            const receiveLib = await lzEndpoint.defaultReceiveLibrary(eid);
            const decodedReceiveConfig = decodeLzConfig(await lzEndpoint.getConfig(oapp, receiveLib, eid, CONFIG_TYPE));
            const receiveConfigParams = [
                eid,
                CONFIG_TYPE,

                encodeLzConfig(
                    decodedReceiveConfig.confirmations,
                    decodedReceiveConfig.requiredDVNCount,
                    decodedReceiveConfig.optionalDVNCount,
                    decodedReceiveConfig.optionalDVNThreshold,
                    [dvn],
                    decodedReceiveConfig.optionalDVNs
                ),
            ];
            // set the receive lib config for this path
            console.log(`setting receive config for ${chain}`);
            await lzEndpoint.setConfig(oapp, receiveLib, [receiveConfigParams]);
        })
    );
};
// struct SetConfigParam {
//     uint32 eid;
//     uint32 configType;
//     bytes config; // will be UlnConfig encoded
// }
// struct UlnConfig {
//     uint64 confirmations;
//     // we store the length of required DVNs and optional DVNs instead of using DVN.length directly to save gas
//     uint8 requiredDVNCount; // 0 indicate DEFAULT, NIL_DVN_COUNT indicate NONE (to override the value of default)
//     uint8 optionalDVNCount; // 0 indicate DEFAULT, NIL_DVN_COUNT indicate NONE (to override the value of default)
//     uint8 optionalDVNThreshold; // (0, optionalDVNCount]
//     address[] requiredDVNs; // no duplicates. sorted an an ascending order. allowed overlap with optionalDVNs
//     address[] optionalDVNs; // no duplicates. sorted an an ascending order. allowed overlap with requiredDVNs
// }
