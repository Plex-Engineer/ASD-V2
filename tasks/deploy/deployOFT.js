const { promptToProceed } = require("../taskHelpers");
const LZ_ENDPOINTS = require("../../constants/lzEndpoints.json");

module.exports = async (taskArgs, hre) => {
    let signers = await ethers.getSigners();
    console.log(`Deploying OFT with ${signers[0].address} on ${hre.network.name}...`);
    const delegate = taskArgs.delegate ?? signers[0].address;
    console.log(`Params: \n name: ${taskArgs.name} \n symbol: ${taskArgs.symbol} \n delegate: ${delegate}`);

    const proceed = await promptToProceed("Proceed with deployment?");
    if (!proceed) {
        console.log("exiting...");
        return;
    }

    const lzEndpointAddress = LZ_ENDPOINTS[hre.network.name].endpoint;

    const contractFactory = await ethers.getContractFactory("contracts/asd/OFT.sol:OFT");
    const contract = await contractFactory.deploy(taskArgs.name, taskArgs.symbol, lzEndpointAddress, delegate);
    await contract.waitForDeployment();

    console.log(`OFT deployed to: ${contract.target}`);
};
