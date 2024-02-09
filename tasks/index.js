// deploy
task("deployASDRouter", "deploy a ASD router contract", require("./deploy/deployASDRouter"));
task("deployOFT", "deploy a OFT contract", require("./deploy/deployOFT"))
    .addParam("name", "name of the contract")
    .addParam("symbol", "symbol of the contract")
    .addOptionalParam("delegate", "delegate owner of the contract");

task("deployASD", "deploy a ASD contract", require("./deploy/deployASD"))
    .addParam("name", "name of the contract")
    .addParam("symbol", "symbol of the contract")
    .addOptionalParam("csrRecipient", "recipient for CSR on this contract");

// oft contract functions
task("setPeer", "set a peer on a local OFT contract", require("./oft/setPeer"))
    .addParam("localContract", "local contract address")
    .addParam("remoteChain", "remote chain name")
    .addParam("remoteContract", "remote contract address");

task("sendOFT", "send OFT to a remote chain", require("./oft/sendOFT"))
    .addParam("localContract", "local contract address")
    .addParam("amount", "amount to send in formatted Value (1 = 1e18) ")
    .addParam("remoteChain", "remote chain name");

// oft information
task("checkPeers", "check peers on a local OFT contract", require("./oft/checkPeers"));

// deploy test contracts
task("deployTestOFT", "d eploy a test USDC OFT contract", require("./deploy/testContracts/deployTestOFT"));
