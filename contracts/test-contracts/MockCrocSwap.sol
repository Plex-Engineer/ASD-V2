pragma solidity ^0.8.22;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ICrocSwapDex, ICrocImpact} from "../ambient/CrocInterfaces.sol";

contract MockCrocSwapDex is ICrocSwapDex {
    address public noteAddress;

    constructor(address _noteAddress) {
        noteAddress = _noteAddress;
    }

    function swap(address base, address quote, uint256 poolIdx, bool isBuy, bool inBaseQty, uint128 qty, uint16 tip, uint128 limitPrice, uint128 minOut, uint8 reserveFlags) external payable returns (int128 baseQuote, int128 quoteFlow) {
        if (isBuy) {
            IERC20(quote).transfer(msg.sender, qty);
            baseQuote = int128(qty);
            quoteFlow = -1 * int128(qty);
        } else {
            IERC20(base).transfer(msg.sender, qty);
            baseQuote = -1 * int128(qty);
            quoteFlow = int128(qty);
        }
    }

    function readSlot(uint256 slot) external view returns (uint256 data) {
        return 1;
    }
}

contract MockCrocImpact is ICrocImpact {
    address public crocSwapDex;

    constructor(address _crocSwapDex) {
        crocSwapDex = _crocSwapDex;
    }

    function calcImpact(address base, address quote, uint256 poolIdx, bool isBuy, bool inBaseQty, uint128 qty, uint16 poolTip, uint128 limitPrice) external view returns (int128 baseFlow, int128 quoteFlow, uint128 finalPrice) {
        if (base == MockCrocSwapDex(crocSwapDex).noteAddress()) {
            return (-1 * int128(qty), int128(qty), 0);
        }
        return (int128(qty), -1 * int128(qty), 0);
    }
}
