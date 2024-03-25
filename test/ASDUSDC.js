const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ASDUSDC", function () {
    let asdUSDC;
    let usdc1;
    let usdc2;
    let usdc3;
    this.beforeEach(async () => {
        // deploy ASDUSDC contract
        asdUSDC = await ethers.deployContract("ASDUSDC");
        // deploy ERC20 contracts as OFT mocks
        usdc1 = await ethers.deployContract("TestERC20", ["USDC1", "USDC1"]);
        usdc2 = await ethers.deployContract("TestERC20", ["USDC2", "USDC2"]);
        usdc3 = await ethers.deployContract("TestERC20", ["USDC3", "USDC3"]);
        // set whitelist for 2 of the tokens
        await asdUSDC.updateWhitelist(usdc1.target, true);
        await asdUSDC.updateWhitelist(usdc2.target, true);
    });

    it("should set whitelist for correct contract addresses", async () => {
        expect(await asdUSDC.whitelistedUSDCVersions(usdc1.target)).to.equal(true);
        expect(await asdUSDC.whitelistedUSDCVersions(usdc2.target)).to.equal(true);
        expect(await asdUSDC.whitelistedUSDCVersions(usdc3.target)).to.equal(false);
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
});
