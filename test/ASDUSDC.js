const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ASDUSDC", function () {
    let asdUSDC;
    let usdc1;
    let usdc2;
    let usdc3;
    let usdc4;
    this.beforeEach(async () => {
        // deploy ASDUSDC contract
        asdUSDC = await ethers.deployContract("ASDUSDC");
        // deploy ERC20 contracts as OFT mocks
        usdc1 = await ethers.deployContract("TestERC20", ["USDC1", "USDC1"]);
        usdc2 = await ethers.deployContract("TestERC20", ["USDC2", "USDC2"]);
        usdc3 = await ethers.deployContract("TestERC20", ["USDC3", "USDC3"]);
        usdc4 = await ethers.deployContract("TestERC20", ["USDC4", "USDC4"]);
        // set decimals for usdc4 to 6
        await usdc4.setDecimals(6);
        // set whitelist for 2 of the tokens
        await asdUSDC.updateWhitelist(usdc1.target, true);
        await asdUSDC.updateWhitelist(usdc2.target, true);
        await asdUSDC.updateWhitelist(usdc4.target, true);
    });

    it("should set whitelist for correct contract addresses", async () => {
        expect(await asdUSDC.whitelistedUSDCVersions(usdc1.target)).to.equal(true);
        expect(await asdUSDC.whitelistedUSDCVersions(usdc2.target)).to.equal(true);
        expect(await asdUSDC.whitelistedUSDCVersions(usdc3.target)).to.equal(false);
        expect(await asdUSDC.whitelistedUSDCVersions(usdc4.target)).to.equal(true);
    });

    it("should deposit whitelisted usdc versions for asdUSDC", async () => {
        const [signer] = await ethers.getSigners();
        const usdc1Deposit = 1000;
        await usdc1.approve(asdUSDC.target, usdc1Deposit);
        await asdUSDC.deposit(usdc1.target, usdc1Deposit);
        expect(await asdUSDC.balanceOf(signer)).to.equal(usdc1Deposit);
        expect(await asdUSDC.usdcBalances(usdc1.target)).to.equal(usdc1Deposit);
        expect(await usdc1.balanceOf(asdUSDC.target)).to.equal(usdc1Deposit);

        const usdc2Deposit = 2000;
        await usdc2.approve(asdUSDC.target, usdc2Deposit);
        await asdUSDC.deposit(usdc2.target, usdc2Deposit);
        expect(await asdUSDC.balanceOf(signer)).to.equal(usdc1Deposit + usdc2Deposit);
        expect(await asdUSDC.usdcBalances(usdc2.target)).to.equal(usdc2Deposit);
        expect(await usdc2.balanceOf(asdUSDC.target)).to.equal(usdc2Deposit);

        await expect(asdUSDC.deposit(usdc3.target, 1000)).to.be.revertedWith("ASDUSDC: USDC version not whitelisted");
    });

    it("should withdraw whitelisted usdc versions for asdUSDC", async () => {
        const [signer] = await ethers.getSigners();
        const usdc1Deposit = 1000;
        await usdc1.approve(asdUSDC.target, usdc1Deposit);
        await asdUSDC.deposit(usdc1.target, usdc1Deposit);
        const usdc2Deposit = 2000;
        await usdc2.approve(asdUSDC.target, usdc2Deposit);
        await asdUSDC.deposit(usdc2.target, usdc2Deposit);

        const usdc1Withdraw = 500;
        await asdUSDC.withdraw(usdc1.target, usdc1Withdraw);
        expect(await asdUSDC.balanceOf(signer)).to.equal(usdc1Deposit + usdc2Deposit - usdc1Withdraw);
        expect(await asdUSDC.usdcBalances(usdc1.target)).to.equal(usdc1Deposit - usdc1Withdraw);
        expect(await usdc1.balanceOf(asdUSDC.target)).to.equal(usdc1Deposit - usdc1Withdraw);

        // withdraw too much USDC
        await expect(asdUSDC.withdraw(usdc1.target, 1000)).to.be.reverted;
    });

    it("should recover USDC tokens sent to the contract", async () => {
        const [signer] = await ethers.getSigners();
        const usdc1Send = 1000;
        await usdc1.transfer(asdUSDC.target, usdc1Send);
        expect(await usdc1.balanceOf(asdUSDC.target)).to.equal(usdc1Send);
        expect(await asdUSDC.usdcBalances(usdc1.target)).to.equal(0);
        expect(await asdUSDC.balanceOf(signer)).to.equal(0);

        await asdUSDC.recover(usdc1.target);
        expect(await asdUSDC.usdcBalances(usdc1.target)).to.equal(usdc1Send);
        expect(await asdUSDC.balanceOf(signer)).to.equal(usdc1Send);
    });

    it("should deposit and withdraw with different decimals", async () => {
        const [signer] = await ethers.getSigners();
        const usdc4Deposit = 1000e6;
        await usdc4.approve(asdUSDC.target, usdc4Deposit);
        await asdUSDC.deposit(usdc4.target, usdc4Deposit);

        const usdc4Withdraw = BigInt(1000e18);
        expect(await asdUSDC.balanceOf(signer)).to.equal(usdc4Withdraw);

        // split withdrawals to try and get rounding errors
        await asdUSDC.withdraw(usdc4.target, usdc4Withdraw / BigInt(2) - BigInt(1));
        await asdUSDC.withdraw(usdc4.target, usdc4Withdraw / BigInt(2) + BigInt(1e12));

        // check that all asdUSDC is burned
        expect(await asdUSDC.balanceOf(signer)).to.equal(0);
        expect(await usdc4.balanceOf(asdUSDC.target), "asdUSDC contract still has USDC4").to.equal(0);
    });
});
