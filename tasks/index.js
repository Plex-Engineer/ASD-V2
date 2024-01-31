// deploy
task("deployTestOFT", "deploy a test USDC OFT contract", require("./deploy/deployTestOFT"));
task("deployASDRouter", "deploy a ASD router contract", require("./deploy/deployASDRouter"));
// oft contract functions
task("setPeer", "set a peer on a local OFT contract", require("./oft/setPeer"))
    .addParam("localContract", "local contract address")
    .addParam("remoteChain", "remote chain name")
    .addParam("remoteContract", "remote contract address");

task("sendOFT", "send OFT to a remote chain", require("./oft/sendOFT"))
    .addParam("localContract", "local contract address")
    .addParam("amount", "amount to send in formatted Value (1 = 1e18) ")
    .addParam("remoteChain", "remote chain name");
