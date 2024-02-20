const LZ_ENDPOINTS = require("../../constants/lzEndpoints.json");

const ADDRESSES = {
    canto: {
        note: "0x4e71A2E537B7f9D9413D3991D37958c0b5e1e503",
        usdcWhitelist: "0x59a49a3646eC96339525B89bEB35c1c095cc1992",
        crocImpact: "0x97B4957BA07914c563a58C1E6c69588f9cCfC051",
        crocSwap: "0x9290c893ce949fe13ef3355660d07de0fb793618",
    },
    "canto-testnet": {
        note: "0x03F734Bd9847575fDbE9bEaDDf9C166F880B5E5f",
        usdcWhitelist: "0xa5bFA7E06eBc71Ca3cc58f5AC0954ebf6E9890E5",
        crocImpact: "0xC62694bFb4a74D0f9A327Af0AC22E72339c1A061",
        crocSwap: "0xd9bac85f6ac9fBFd2559A4Ac2883c635C29Feb4b",
    },
};

module.exports = async (taskArgs, hre) => {
    const addresses = ADDRESSES[hre.network.name];
    if (!addresses) {
        throw new Error(`Unsupported network for ASDRouter: ${hre.network.name}`);
    }

    let signers = await ethers.getSigners();
    console.log(`Deploying ASDRouter with ${signers[0].address} on ${hre.network.name}...`);

    const contractFactory = await ethers.getContractFactory("ASDRouter");

    const lzEndpointEID = LZ_ENDPOINTS[hre.network.name].id;

    const contract = await contractFactory.deploy(addresses.note, lzEndpointEID, addresses.crocSwap, addresses.crocImpact);
    await contract.waitForDeployment();

    console.log(`ASDRouter deployed to: ${contract.target}`);

    // set whitelist
    console.log(`Setting whitelist...`);
    await (await contract.updateWhitelist(addresses.usdcWhitelist, true)).wait();
    console.log(`Whitelist set!`);
};
