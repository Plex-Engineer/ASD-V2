pragma solidity ^0.8.22;

import "@layerzerolabs/lz-evm-oapp-v2/contracts/oft/OFT.sol";

contract TESTUSDCOFT is OFT {
    constructor(address _lzEndpoint) OFT("TESTUSDCOFT", "TUSDC", _lzEndpoint, msg.sender) {
        _mint(msg.sender, 1000 ether);
    }
}
