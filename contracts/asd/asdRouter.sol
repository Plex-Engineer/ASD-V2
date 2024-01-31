pragma solidity ^0.8.22;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IOAppComposer} from "@layerzerolabs/lz-evm-oapp-v2/contracts/oapp/interfaces/IOAppComposer.sol";
import {OFTComposeMsgCodec} from "@layerzerolabs/lz-evm-oapp-v2/contracts/oft/libs/OFTComposeMsgCodec.sol";

/**
 * @title ASDRouter
 */

contract ASDRouter is IOAppComposer, Ownable {
    address public noteAddress;
    uint16 public cantoLzEID;
    mapping(address => bool) public whitelistedOFTStableCoins;

    constructor(address _noteAddress, uint16 _cantoLzEID) {
        noteAddress = _noteAddress;
        cantoLzEID = _cantoLzEID;
    }

    /**
     * @notice updates the whitelist for swapping OFT stable coins to $NOTE
     * @dev only callable by the owner
     * @param _oftAddress The address of the OFT stable coin contract
     * @param _whitelisted Whether or not the OFT stable coin is whitelisted
     */
    function updateWhitelist(address _oftAddress, bool _whitelisted) external onlyOwner {
        whitelistedOFTStableCoins[_oftAddress] = _whitelisted;
    }

    event LZReceived(address _from, bytes32 _guid, bytes _message, address _executor, bytes _extraData, uint _value);
    event RouterPayload(uint64 _nonce, uint32 _srcEid, uint256 _amountLD, bytes32 _composeFrom, bytes _composeMsg);

    function lzCompose(address _from, bytes32 _guid, bytes calldata _message, address _executor, bytes calldata _extraData) external payable {
        emit LZReceived(_from, _guid, _message, _executor, _extraData, msg.value);
        (uint64 nonce, uint32 srcEid, uint256 amountLD, bytes32 composeFrom, bytes memory composeMsg) = _decodeOFTComposeMsg(_message);
        emit RouterPayload(nonce, srcEid, amountLD, composeFrom, composeMsg);
    }

    function _decodeOFTComposeMsg(bytes calldata _message) internal pure returns (uint64 _nonce, uint32 _srcEid, uint256 _amountLD, bytes32 _composeFrom, bytes memory _composeMsg) {
        _nonce = OFTComposeMsgCodec.nonce(_message);
        _srcEid = OFTComposeMsgCodec.srcEid(_message);
        _amountLD = OFTComposeMsgCodec.amountLD(_message);
        _composeFrom = OFTComposeMsgCodec.composeFrom(_message);
        _composeMsg = OFTComposeMsgCodec.composeMsg(_message);
    }
}
