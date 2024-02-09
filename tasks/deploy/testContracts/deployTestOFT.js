const LZ_ENDPOINTS = require("../../../constants/lzEndpoints.json");

module.exports = async (taskArgs, hre) => {
    let signers = await ethers.getSigners();
    console.log(`Deploying TestUSDCOFT with ${signers[0].address} on ${hre.network.name}...`);

    const lzEndpointAddress = LZ_ENDPOINTS[hre.network.name].endpoint;
    console.log(`LZ endpoint address: ${lzEndpointAddress}`);

    const contractFactory = await ethers.getContractFactory("TESTUSDCOFT");
    const contract = await contractFactory.deploy(lzEndpointAddress);
    await contract.waitForDeployment();

    console.log(`TestUSDCOFT deployed to: ${contract.target}`);
};
