pragma solidity ^0.8.22;

import {IERC20, ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract TestASD is ERC20 {
    address public immutable note; // Reference to the cNOTE token

    constructor(string memory _name, string memory _symbol, address _note) ERC20(_name, _symbol) {
        note = _note;
    }

    function mint(uint256 _amount) external {
        SafeERC20.safeTransferFrom(IERC20(note), msg.sender, address(this), _amount);
        _mint(msg.sender, _amount);
    }
}
