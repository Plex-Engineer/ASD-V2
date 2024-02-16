const LZ_ENDPOINTS = require("../../constants/lzEndpoints.json");

module.exports = async (taskArgs, hre) => {
    let noteAddress;
    let usdcWhitelistAddress;
    if (hre.network.name === "canto") {
        noteAddress = "0x4e71A2E537B7f9D9413D3991D37958c0b5e1e503";
        usdcWhitelistAddress = "0x59a49a3646eC96339525B89bEB35c1c095cc1992";
    } else if (hre.network.name === "canto-testnet") {
        noteAddress = "0x03F734Bd9847575fDbE9bEaDDf9C166F880B5E5f";
        usdcWhitelistAddress = "0xa5bFA7E06eBc71Ca3cc58f5AC0954ebf6E9890E5";
    } else {
        throw new Error(`Unsupported network for ASDRouter: ${hre.network.name}`);
    }

    let signers = await ethers.getSigners();
    console.log(`Deploying ASDRouter with ${signers[0].address} on ${hre.network.name}...`);

    const contractFactory = await ethers.getContractFactory("ASDRouter");

    const lzEndpointEID = LZ_ENDPOINTS[hre.network.name].id;

    const contract = await contractFactory.deploy(noteAddress, lzEndpointEID);
    await contract.waitForDeployment();

    console.log(`ASDRouter deployed to: ${contract.target}`);

    // set whitelist
    console.log(`Setting whitelist...`);
    await (await contract.updateWhitelist(usdcWhitelistAddress, true)).wait();
    console.log(`Whitelist set!`);
};
