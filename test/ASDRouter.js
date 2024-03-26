const { expect } = require("chai");
const helpers = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { ethers } = require("hardhat");
const LZ_ENDPOINTS = require("../constants/lzEndpoints.json");

const generatedComposeMsg = (from, amount, payload) =>
    ethers.solidityPacked(
        ["uint64", "uint32", "uint256", "bytes"],
        ["1", "1", amount, new ethers.AbiCoder().encode(["address"], [from]) + payload.replace("0x", "")]
    );
const guid = ethers.encodeBytes32String("test-guid");

const generatedRouterPayload = (dstEid, dstReceiver, dstASD, cantoASD, minASD, from, fee) =>
    new ethers.AbiCoder().encode(
        ["uint32", "address", "address", "address", "uint256", "address", "uint256"],
        [dstEid, dstReceiver, dstASD, cantoASD, minASD, from, fee]
    );
const errorMessages = {
    invalidPayload: "Invalid composeMsg length",
    notWhitelisted: "not whitelisted",
    badSwap: "swap failed",
    insufficientFee: "insufficient msg.value for send fee",
};

describe("ASDRouter", function () {
    const cantoLzEndpoint = LZ_ENDPOINTS["canto-testnet"];

    const executorAddress = "0xc0ffee254729296a45a3885639AC7E10F9d54979"; // random address
    const refundAddress = "0x9C29A5579EdfaA8F08dE82E805ea5744D9c50F9D"; // random address

    // testing contracts
    let Note;
    let USDCOFT;
    let TESTASD;
    let ASDRouter;
    let CrocSwap;
    let CrocImpact;
    let ASDUSDC;

    // test amounts
    const amountUSDCSent = ethers.parseEther("100");

    this.beforeEach(async () => {
        // deploy all contracts
        Note = await ethers.deployContract("TestERC20", ["Note", "NOTE"]);
        USDCOFT = await ethers.deployContract("TestERC20", ["USDCOFT", "USDCOFT"]);
        TESTASD = await ethers.deployContract("TestASD", ["ASD", "ASD", Note.target]);
        // ambient test contracts
        CrocSwap = await ethers.deployContract("MockCrocSwapDex", [Note.target]);
        CrocImpact = await ethers.deployContract("MockCrocImpact", [CrocSwap.target]);
        // ASDUSDC contract
        ASDUSDC = await ethers.deployContract("ASDUSDC");
        // Router
        ASDRouter = await ethers.deployContract("ASDRouter", [
            Note.target,
            cantoLzEndpoint.id,
            CrocSwap.target,
            CrocImpact.target,
            ASDUSDC.target,
        ]);

        // transfer USDC to router as if it was already sent
        await USDCOFT.transfer(ASDRouter.target, amountUSDCSent);
        expect(await USDCOFT.balanceOf(ASDRouter.target)).to.equal(amountUSDCSent);

        // transfer NOTE to CrocDex so it can be "swapped" for
        await Note.transfer(CrocSwap.target, ethers.parseEther("1000"));
        expect(await Note.balanceOf(CrocSwap.target)).to.equal(ethers.parseEther("1000"));
    });

    this.afterEach(async () => {
        // remove native balance from refund address
        await helpers.setBalance(refundAddress, 0);
    });

    it("lzCompose: invalid payload", async () => {
        // call lzCompose with invalid payload
        await expect(ASDRouter.lzCompose(USDCOFT.target, guid, generatedComposeMsg(refundAddress, amountUSDCSent, "0x"), executorAddress, "0x"))
            .to.emit(ASDRouter, "TokenRefund")
            .withArgs(guid, USDCOFT.target, refundAddress, amountUSDCSent, 0, errorMessages.invalidPayload);

        // expect USDC to be refunded
        expect(await USDCOFT.balanceOf(refundAddress)).to.equal(amountUSDCSent);
    });

    it("lzCompose: invalid payload with gas", async () => {
        const gas = ethers.parseEther("1");
        // call lzCompose with invalid payload
        await expect(
            ASDRouter.lzCompose(USDCOFT.target, guid, generatedComposeMsg(refundAddress, amountUSDCSent, "0x"), executorAddress, "0x", {
                value: gas,
            })
        )
            .to.emit(ASDRouter, "TokenRefund")
            .withArgs(guid, USDCOFT.target, refundAddress, amountUSDCSent, gas, errorMessages.invalidPayload);
        // expect USDC to be refunded
        expect(await USDCOFT.balanceOf(refundAddress)).to.equal(amountUSDCSent);
        expect(await ethers.provider.getBalance(refundAddress)).to.equal(gas);
    });

    it("lzCompose: not whitelisted", async () => {
        // call lzCompose with un-whitelisted token
        await expect(
            ASDRouter.lzCompose(
                USDCOFT.target,
                guid,
                generatedComposeMsg(
                    refundAddress,
                    amountUSDCSent,
                    generatedRouterPayload(cantoLzEndpoint.id, refundAddress, TESTASD.target, TESTASD.target, "0", refundAddress, "0")
                ),
                executorAddress,
                "0x"
            )
        )
            .to.emit(ASDRouter, "TokenRefund")
            .withArgs(guid, USDCOFT.target, refundAddress, amountUSDCSent, 0, errorMessages.notWhitelisted);
        // expect USDC to be refunded
        expect(await USDCOFT.balanceOf(refundAddress)).to.equal(amountUSDCSent);
    });

    it("lzCompose: not whitelisted with gas", async () => {
        const gas = ethers.parseEther("1");
        // call lzCompose with un-whitelisted token
        await expect(
            ASDRouter.lzCompose(
                USDCOFT.target,
                guid,
                generatedComposeMsg(
                    refundAddress,
                    amountUSDCSent,
                    generatedRouterPayload(cantoLzEndpoint.id, refundAddress, TESTASD.target, TESTASD.target, "0", refundAddress, "0")
                ),
                executorAddress,
                "0x",
                { value: gas }
            )
        )
            .to.emit(ASDRouter, "TokenRefund")
            .withArgs(guid, USDCOFT.target, refundAddress, amountUSDCSent, gas, errorMessages.notWhitelisted);
        // expect USDC to be refunded
        expect(await USDCOFT.balanceOf(refundAddress)).to.equal(amountUSDCSent);
        expect(await ethers.provider.getBalance(refundAddress)).to.equal(gas);
    });

    it("lzCompose: bad swap", async () => {
        // whitelist USDC
        await ASDUSDC.updateWhitelist(USDCOFT.target, true);
        // call lzCompose with minASD too high
        await expect(
            ASDRouter.lzCompose(
                USDCOFT.target,
                guid,
                generatedComposeMsg(
                    refundAddress,
                    amountUSDCSent,
                    generatedRouterPayload(
                        cantoLzEndpoint.id,
                        refundAddress,
                        TESTASD.target,
                        TESTASD.target,
                        ethers.parseEther("10000").toString(),
                        refundAddress,
                        "0"
                    )
                ),
                executorAddress,
                "0x"
            )
        )
            .to.emit(ASDRouter, "TokenRefund")
            .withArgs(guid, ASDUSDC.target, refundAddress, amountUSDCSent, 0, errorMessages.badSwap);
        // expect asd-USDC to be refunded
        expect(await ASDUSDC.balanceOf(refundAddress)).to.equal(amountUSDCSent);
    });

    it("lzCompose: bad swap with gas", async () => {
        // whitelist USDC
        await ASDUSDC.updateWhitelist(USDCOFT.target, true);
        const gas = ethers.parseEther("1");
        // call lzCompose with minASD too high
        await expect(
            ASDRouter.lzCompose(
                USDCOFT.target,
                guid,
                generatedComposeMsg(
                    refundAddress,
                    amountUSDCSent,
                    generatedRouterPayload(
                        cantoLzEndpoint.id,
                        refundAddress,
                        TESTASD.target,
                        TESTASD.target,
                        ethers.parseEther("100000").toString(),
                        refundAddress,
                        "0"
                    )
                ),
                executorAddress,
                "0x",
                { value: gas }
            )
        )
            .to.emit(ASDRouter, "TokenRefund")
            .withArgs(guid, ASDUSDC.target, refundAddress, amountUSDCSent, gas, errorMessages.badSwap);
        // expect USDC to be refunded
        expect(await ASDUSDC.balanceOf(refundAddress)).to.equal(amountUSDCSent);
        expect(await ethers.provider.getBalance(refundAddress)).to.equal(gas);
    });

    it("lzCompose: insufficient send fee", async () => {
        // update whitelist
        await ASDUSDC.updateWhitelist(USDCOFT.target, true);
        // call lzCompose with msg.value less than send fee (dst not canto)
        await expect(
            ASDRouter.lzCompose(
                USDCOFT.target,
                guid,
                generatedComposeMsg(
                    refundAddress,
                    amountUSDCSent,
                    generatedRouterPayload(
                        cantoLzEndpoint.id + 1,
                        refundAddress,
                        TESTASD.target,
                        TESTASD.target,
                        "0",
                        refundAddress,
                        ethers.parseEther("10").toString() // test fee
                    )
                ),
                executorAddress,
                "0x"
            )
        )
            .to.emit(ASDRouter, "TokenRefund")
            .withArgs(guid, TESTASD.target, refundAddress, amountUSDCSent, 0, errorMessages.insufficientFee);
        // expect ASD to be refunded
        expect(await TESTASD.balanceOf(refundAddress)).to.equal(amountUSDCSent);
    });

    it("lzCompose: insufficient send fee with gas", async () => {
        // update whitelist
        await ASDUSDC.updateWhitelist(USDCOFT.target, true);
        const gas = ethers.parseEther("1");
        // call lzCompose with msg.value less than send fee (dst not canto)
        await expect(
            ASDRouter.lzCompose(
                USDCOFT.target,
                guid,
                generatedComposeMsg(
                    refundAddress,
                    amountUSDCSent,
                    generatedRouterPayload(
                        cantoLzEndpoint.id + 1,
                        refundAddress,
                        TESTASD.target,
                        TESTASD.target,
                        "0",
                        refundAddress,
                        ethers.parseEther("10").toString() // test fee
                    )
                ),
                executorAddress,
                "0x",
                { value: gas }
            )
        )
            .to.emit(ASDRouter, "TokenRefund")
            .withArgs(guid, TESTASD.target, refundAddress, amountUSDCSent, gas, errorMessages.insufficientFee);
        // expect ASD to be refunded
        expect(await TESTASD.balanceOf(refundAddress)).to.equal(amountUSDCSent);
        expect(await ethers.provider.getBalance(refundAddress)).to.equal(gas);
    });

    it("lzCompose: successful deposit and send on canto", async () => {
        // update whitelist
        await ASDUSDC.updateWhitelist(USDCOFT.target, true);
        // call lzCompose with valid payload
        await expect(
            ASDRouter.lzCompose(
                USDCOFT.target,
                guid,
                generatedComposeMsg(
                    refundAddress,
                    amountUSDCSent,
                    generatedRouterPayload(cantoLzEndpoint.id, refundAddress, TESTASD.target, TESTASD.target, "0", refundAddress, "0")
                ),
                executorAddress,
                "0x"
            )
        )
            .to.emit(ASDRouter, "ASDSent")
            .withArgs(guid, refundAddress, TESTASD.target, amountUSDCSent, cantoLzEndpoint.id, false);
        // expect ASD to be sent to canto
        expect(await TESTASD.balanceOf(refundAddress)).to.equal(amountUSDCSent);
    });
});
