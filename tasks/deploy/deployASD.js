const LZ_ENDPOINTS = require("../../constants/lzEndpoints.json");
const { promptToProceed } = require("../taskHelpers");

module.exports = async (taskArgs, hre) => {
    const testnet = hre.network.name === "canto-testnet" ? true : hre.network.name === "canto" ? false : null;
    // check network is canto or canto-testnet
    if (testnet === null) {
        console.log("This task is only available on canto and canto-testnet networks");
        return;
    }

    // get cNote address from canto network
    const cNoteAddress = testnet ? "0x04E52476d318CdF739C38BD41A922787D441900c" : "0xEe602429Ef7eCe0a13e4FfE8dBC16e101049504C";
    console.log(`cNote address: ${cNoteAddress}`);

    let signers = await ethers.getSigners();
    console.log(`Deploying ASD OFT with ${signers[0].address} on ${hre.network.name}...`);

    const csrRecipient = taskArgs.csrRecipient ?? signers[0].address;
    const lzEndpointAddress = LZ_ENDPOINTS[hre.network.name].endpoint;

    console.log(
        `Params: \n name: ${taskArgs.name} \n symbol: ${taskArgs.symbol} \n lzEndpoint: ${lzEndpointAddress} \n cNote: ${cNoteAddress} \n csrRecipient: ${csrRecipient}`
    );

    const proceed = await promptToProceed("Proceed with deployment?");
    if (!proceed) {
        console.log("exiting...");
        return;
    }

    const contractFactory = await ethers.getContractFactory("ASDOFT");
    const contract = await contractFactory.deploy(taskArgs.name, taskArgs.symbol, lzEndpointAddress, cNoteAddress, csrRecipient);
    await contract.waitForDeployment();

    console.log(`ASD OFT deployed to: ${contract.target}`);
};
