module.exports = async (taskArgs, hre) => {
    let signers = await ethers.getSigners();
    console.log(`current local signer: ${signers[0].address}`);

    const routerContract = await ethers.getContractAt("ASDRouter", taskArgs.routerAddress);

    // set whitelist with the address passed in
    console.log(`Setting whitelist...`);
    await (await routerContract.updateWhitelist(taskArgs.whitelistAddress, true)).wait();
    console.log(`Whitelist set!`);
};
