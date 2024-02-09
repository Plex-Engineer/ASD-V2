const LZ_ENDPOINTS = require("../../constants/lzEndpoints.json");
const LZ_UTILS = require("@layerzerolabs/lz-v2-utilities");
const { promptToProceed } = require("../taskHelpers");

module.exports = async (taskArgs, hre) => {
    let signers = await ethers.getSigners();
    console.log(`current local signer: ${signers[0].address}`);

    // get local contract instance
    const localContractInstance = await ethers.getContractAt("ASDOFT", taskArgs.localContract);

    // make sure this address has enough OFT to send
    const oftBalance = await localContractInstance.balanceOf(signers[0].address);
    if (oftBalance < Number(ethers.parseEther(taskArgs.amount))) {
        console.log(`insufficient OFT balance, current balance: ${ethers.formatEther(oftBalance)}`);
        return;
    }

    // get remote EID
    const remoteEID = LZ_ENDPOINTS[taskArgs.remoteChain].id;

    // create options for sending
    const optionBuilder = LZ_UTILS.Options.newOptions();
    const executorGas = 200000;
    const executorValue = 0;
    optionBuilder.addExecutorLzReceiveOption(executorGas, executorValue);

    const sendParams = [
        remoteEID,
        LZ_UTILS.hexZeroPadTo32(signers[0].address),
        ethers.parseEther(taskArgs.amount),
        ethers.parseEther(taskArgs.amount),
        optionBuilder.toHex(),
        "0x",
        "0x",
    ];

    // quote the send transaction
    const sendQuote = await localContractInstance.quoteSend(sendParams, false);

    // make sure gas price is not too high for user
    const proceed = await promptToProceed(`gas price: ${ethers.formatEther(sendQuote[0])} okay?`);
    if (!proceed) {
        console.log("exiting...");
        return;
    }

    // send the OFT
    const tx = await (await localContractInstance.send(sendParams, [sendQuote[0], "0"], signers[0].address, { value: sendQuote[0] })).wait();

    console.log(`tx hash: ${tx.hash}`);
};
