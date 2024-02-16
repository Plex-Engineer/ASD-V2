const { promptToProceed } = require("../taskHelpers");
const LZ_ENDPOINTS = require("../../constants/lzEndpoints.json");

module.exports = async (taskArgs, hre) => {
    let signers = await ethers.getSigners();
    console.log(`Deploying OFTAdapter with ${signers[0].address} on ${hre.network.name}...`);

    const delegate = taskArgs.delegate ?? signers[0].address;
    const underlyingToken = taskArgs.underlyingToken;

    console.log(`Params: \n underlyingToken: ${underlyingToken} \n delegate: ${delegate}`);
    const proceed = await promptToProceed("Proceed with deployment?");
    if (!proceed) {
        console.log("exiting...");
        return;
    }
    const lzEndpointAddress = LZ_ENDPOINTS[hre.network.name].endpoint;

    const contractFactory = await ethers.getContractFactory("contracts/asd/OFTAdapter.sol:OFTAdapter");
    const contract = await contractFactory.deploy(underlyingToken, lzEndpointAddress, delegate);
    await contract.waitForDeployment();

    console.log(`OFTAdapter deployed to: ${contract.target}`);
};
