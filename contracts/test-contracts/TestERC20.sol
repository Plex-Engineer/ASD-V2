pragma solidity ^0.8.22;

import {IERC20, ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract TestERC20 is ERC20 {
    uint8 private _decimals;

    constructor(string memory _name, string memory _symbol) ERC20(_name, _symbol) {
        _decimals = 18;
        _mint(msg.sender, 1000 ether);
    }

    // for cNote test implementation
    function underlying() public view returns (address) {
        return address(this);
    }

    function decimals() public view override returns (uint8) {
        return _decimals;
    }

    function setDecimals(uint8 _val) public {
        _decimals = _val;
    }
}
