pragma solidity ^0.8.22;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title ASDUSDC
 * @notice This contract wraps multiple versions of USDC into one token
 */
contract ASDUSDC is ERC20, Ownable {
    mapping(address => bool) public whitelistedUSDCVersions;
    mapping(address => uint256) public usdcBalances;

    event Deposit(address _version, uint _amount);
    event Withdrawal(address _version, uint _amount);

    constructor() ERC20("ASD USDC", "asdUSDC") {}

    /**
     * @notice Add a USDC version to the whitelist
     * @param _usdcVersion Address of the USDC version to add
     */
    function updateWhitelist(address _usdcVersion, bool _isWhitelisted) external onlyOwner {
        whitelistedUSDCVersions[_usdcVersion] = _isWhitelisted;
    }

    /**
     * @notice Deposit USDC and mint asdUSDC tokens
     * @param _usdcVersion Address of the USDC version to deposit
     * @param _amount Amount of USDC to deposit
     * @return Amount of asdUSDC tokens minted
     */
    function deposit(address _usdcVersion, uint256 _amount) external returns (uint256) {
        // check whitelist
        require(whitelistedUSDCVersions[_usdcVersion], "ASDUSDC: USDC version not whitelisted");
        SafeERC20.safeTransferFrom(ERC20(_usdcVersion), msg.sender, address(this), _amount);
        usdcBalances[_usdcVersion] += _amount;
        // Mint the same amount of asdUSDC tokens but take decimals into account
        uint256 amountToMint = _calculateASDUSDCAmount(_amount, ERC20(_usdcVersion).decimals());
        _mint(msg.sender, amountToMint);
        emit Deposit(_usdcVersion, _amount);
        return amountToMint;
    }

    /**
     * @notice Withdraw USDC and burn asdUSDC tokens
     * @param _usdcVersion Address of the USDC version to withdraw
     * @param _amount Amount of asdUSDC tokens to burn
     * @return Amount of USDC withdrawn
     */
    function withdraw(address _usdcVersion, uint256 _amount) external returns (uint256) {
        // calculate amount to withdraw
        uint256 amountToWithdraw = _calculateUSDCVersionAmount(_amount, ERC20(_usdcVersion).decimals());
        // recalculate the amount to burn since usdc version could have less decimals
        uint256 amountToBurn = _calculateASDUSDCAmount(amountToWithdraw, ERC20(_usdcVersion).decimals());
        _burn(msg.sender, amountToBurn);
        // check balance
        require(usdcBalances[_usdcVersion] >= amountToWithdraw, "ASDUSDC: Not enough USDC balance");
        // transfer USDC
        usdcBalances[_usdcVersion] -= amountToWithdraw;
        SafeERC20.safeTransfer(ERC20(_usdcVersion), msg.sender, amountToWithdraw);
        emit Withdrawal(_usdcVersion, amountToWithdraw);
        return amountToWithdraw;
    }

    /**
     * @notice Recover any USDC that was sent to the contract by mistake
     * @param _usdcVersion Address of the USDC version to recover
     * @return Amount of USDC minted
     */
    function recover(address _usdcVersion) external onlyOwner returns (uint256) {
        // check whitelist
        require(whitelistedUSDCVersions[_usdcVersion], "ASDUSDC: USDC version not whitelisted");
        // recover amount
        uint amountToRecover = ERC20(_usdcVersion).balanceOf(address(this)) - usdcBalances[_usdcVersion];
        usdcBalances[_usdcVersion] += amountToRecover;
        // mint tokens
        uint256 amountToMint = _calculateASDUSDCAmount(amountToRecover, ERC20(_usdcVersion).decimals());
        _mint(msg.sender, amountToMint);
        return amountToMint;
    }

    /**
     * @notice calculates the amount of usdcVersion from asdUSDC amount
     * @param _asdUSDCAmount amount of asdUSDC
     * @param _usdcDecimals decimals of usdc version
     */
    function _calculateUSDCVersionAmount(uint _asdUSDCAmount, uint8 _usdcDecimals) internal view returns (uint) {
        return _asdUSDCAmount / (10 ** (this.decimals() - _usdcDecimals));
    }

    /**
     * @notice calculates the amount of this token from the usdc version amount
     * @param _usdcVersionAmount amount of usdc version amount
     * @param _usdcDecimals decimals of usdc version
     */
    function _calculateASDUSDCAmount(uint _usdcVersionAmount, uint8 _usdcDecimals) internal view returns (uint) {
        return _usdcVersionAmount * (10 ** (this.decimals() - _usdcDecimals));
    }
}
