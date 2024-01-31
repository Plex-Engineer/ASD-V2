const LZ_ENDPOINTS = require("../../constants/lzEndpoints.json");

module.exports = async (taskArgs, hre) => {
    const noteAddress = "0x03F734Bd9847575fDbE9bEaDDf9C166F880B5E5f";
    const testUSDCWhitelistAddress = "0xa5bFA7E06eBc71Ca3cc58f5AC0954ebf6E9890E5";

    let signers = await ethers.getSigners();
    console.log(`Deploying ASDRouter with ${signers[0].address} on ${hre.network.name}...`);

    const contractFactory = await ethers.getContractFactory("ASDRouter");

    const lzEndpointEID = LZ_ENDPOINTS[hre.network.name].id;

    const contract = await contractFactory.deploy(noteAddress, lzEndpointEID);
    await contract.waitForDeployment();

    console.log(`ASDRouter deployed to: ${contract.target}`);

    // set whitelist
    console.log(`Setting whitelist...`);
    await (await contract.updateWhitelist(testUSDCWhitelistAddress, true)).wait();
    console.log(`Whitelist set!`);
};
