pragma solidity ^0.8.22;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IOAppComposer} from "@layerzerolabs/lz-evm-oapp-v2/contracts/oapp/interfaces/IOAppComposer.sol";
import {OFTComposeMsgCodec} from "@layerzerolabs/lz-evm-oapp-v2/contracts/oft/libs/OFTComposeMsgCodec.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ASDOFT} from "./asdOFT.sol";
import {IOFT, SendParam, MessagingFee} from "@layerzerolabs/lz-evm-oapp-v2/contracts/oft/interfaces/IOFT.sol";
import {OptionsBuilder} from "@layerzerolabs/lz-evm-oapp-v2/contracts/oapp/libs/OptionsBuilder.sol";

/**
 * @title ASDRouter
 */

contract ASDRouter is IOAppComposer, Ownable {
    address public noteAddress;
    uint32 public cantoLzEID;
    mapping(address => bool) public whitelistedOFTStableCoins;

    struct OftComposeMessage {
        uint32 _dstLzEid;
        address _dstReceiver;
        address _dstAsdAddress;
        address _cantoAsdAddress;
        uint256 _minAmountASD;
        address _cantoRefundAddress;
        uint256 _feeForSend;
    }

    event LZReceived(bytes32 indexed _guid, address _from, bytes _message, address _executor, bytes _extraData, uint _value);

    event TokenRefund(bytes32 indexed _guid, address _tokenAddress, address _refundAddress, uint _amount, uint _nativeAmount, string _reason);

    event ASDSent(bytes32 indexed _guid, address _to, address _asdAddress, uint _amount, uint32 _dstEid, bool _lzSend);

    constructor(address _noteAddress, uint32 _cantoLzEID) {
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

    /**
     * @notice Called by the LZ executor after sending IFT tokens to this contract.
     * @param _from The address of the OFT on this chain.
     * @param _guid The GUID of the message.
     * @param _message The message payload from the executor formatted as an OFT composed message.
     * @param _executor The address of the executor.
     * @param _extraData Additional data supplied by the executor.
     * @dev Cannot revert anywhere, must send the tokens to the intended receiver if something fails (token's will be lost otherwise)
     */
    function lzCompose(address _from, bytes32 _guid, bytes calldata _message, address _executor, bytes calldata _extraData) external payable {
        /* log event */
        emit LZReceived(_guid, _from, _message, _executor, _extraData, msg.value);

        /* decode OFT composed message */
        (, , uint256 amountLD, bytes32 composeFrom, bytes memory composeMsg) = _decodeOFTComposeMsg(_message);

        /* decode composed message payload */

        // check the composed message for proper formatting
        if (composeMsg.length != 224) {
            // return tokens to the address that sent them (composeFrom)
            _refundToken(_guid, _from, OFTComposeMsgCodec.bytes32ToAddress(composeFrom), amountLD, msg.value, "Invalid composeMsg length");
            return;
        }
        OftComposeMessage memory payload = abi.decode(composeMsg, (OftComposeMessage));

        /* check if the OFT stable coin is whitelisted */
        if (!whitelistedOFTStableCoins[_from]) {
            // return tokens to the refund address on canto
            _refundToken(_guid, _from, payload._cantoRefundAddress, amountLD, msg.value, "not whitelisted");
            return;
        }

        /* swap tokens for $NOTE (check minAmount for slippage) */
        (uint amountNote, bool successfulSwap) = _swapOFTForNote(_from, amountLD, payload._minAmountASD);

        // check if the swap was successful
        if (!successfulSwap) {
            // return tokens to the refund address on canto
            _refundToken(_guid, _from, payload._cantoRefundAddress, amountLD, msg.value, "swap failed");
            return;
        }

        /* deposit $NOTE to the correct asd vault to receive ASD tokens */
        (bool successfulDeposit, string memory reason) = _depositNoteToASDVault(payload._cantoAsdAddress, amountNote);

        // check if deposit was successful
        if (!successfulDeposit) {
            // return $NOTE to the refund address on canto since OFT was swapped already
            _refundToken(_guid, noteAddress, payload._cantoRefundAddress, amountNote, msg.value, reason);
            return;
        }

        /* transfer the ASD tokens to the destination receiver */
        _sendASD(_guid, payload, amountNote);
    }

    /**
     *
     * @param _message The message payload from the executor formatted as an OFT composed message.
     * @return _nonce The nonce value.
     * @return _srcEid The source endpoint ID.
     * @return _amountLD The amount in local decimals.
     * @return _composeFrom The composeFrom value (msg.sender on from chain).
     * @return _composeMsg The composed message.
     */
    function _decodeOFTComposeMsg(bytes calldata _message) internal pure returns (uint64 _nonce, uint32 _srcEid, uint256 _amountLD, bytes32 _composeFrom, bytes memory _composeMsg) {
        _nonce = OFTComposeMsgCodec.nonce(_message);
        _srcEid = OFTComposeMsgCodec.srcEid(_message);
        _amountLD = OFTComposeMsgCodec.amountLD(_message);
        _composeFrom = OFTComposeMsgCodec.composeFrom(_message);
        _composeMsg = OFTComposeMsgCodec.composeMsg(_message);
    }

    /**
     * @param _guid the GUID of the message from layer zero.
     * @param _payload the payload of the message.
     * @param _amount  the amount of ASD tokens to send.
     */
    function _sendASD(bytes32 _guid, OftComposeMessage memory _payload, uint _amount) internal {
        /* transfer the ASD tokens to the destination receiver */
        if (_payload._dstLzEid == cantoLzEID) {
            // just transfer the ASD tokens to the destination receiver
            emit ASDSent(_guid, _payload._dstReceiver, _payload._cantoAsdAddress, _amount, _payload._dstLzEid, false);
            ASDOFT(_payload._cantoAsdAddress).transfer(_payload._dstReceiver, _amount);
        } else {
            // use Layer Zero oapp to send ASD tokens to the destination receiver on the destination chain

            // make sure msg.value is enough to cover the fee or this transaction will revert
            if (msg.value < _payload._feeForSend) {
                // refund ASD tokens on canto
                _refundToken(_guid, _payload._cantoAsdAddress, _payload._cantoRefundAddress, _amount, msg.value, "insufficient msg.value for send fee");
                return;
            }

            // create send params for the Layer Zero oapp
            bytes memory sendOptions = OptionsBuilder.addExecutorLzReceiveOption(OptionsBuilder.newOptions(), 200000, 0);
            SendParam memory sendParams = SendParam({dstEid: _payload._dstLzEid, to: OFTComposeMsgCodec.addressToBytes32(_payload._dstReceiver), amountLD: _amount, minAmountLD: _amount, extraOptions: sendOptions, composeMsg: "0x", oftCmd: "0x"});
            MessagingFee memory fee = MessagingFee({nativeFee: _payload._feeForSend, lzTokenFee: 0});

            // send tokens
            (bool successfulSend, bytes memory data) = payable(_payload._cantoAsdAddress).call{value: _payload._feeForSend}(abi.encodeWithSelector(IOFT.send.selector, sendParams, fee, _payload._cantoRefundAddress));

            // check if the send was successful
            if (!successfulSend) {
                // refund ASD tokens on canto
                _refundToken(_guid, _payload._cantoAsdAddress, _payload._cantoRefundAddress, _amount, msg.value, string(data));
                return;
            }
            emit ASDSent(_guid, _payload._dstReceiver, _payload._cantoAsdAddress, _amount, _payload._dstLzEid, true);
        }
    }

    /**
     * @notice refunds tokens when lzCompose fails
     * @param _guid The GUID of the message from layer zero.
     * @param _tokenAddress address of token
     * @param _refundAddress address to refund to on canto
     * @param _amount amount to send
     * @param _nativeAmount amount to send in native token
     */
    function _refundToken(bytes32 _guid, address _tokenAddress, address _refundAddress, uint _amount, uint _nativeAmount, string memory _reason) internal {
        // emit event
        emit TokenRefund(_guid, _tokenAddress, _refundAddress, _amount, _nativeAmount, _reason);
        // transfer tokens to refund address
        IERC20(_tokenAddress).transfer(_refundAddress, _amount);
        // transfer native tokens to refund address and check that this value is less than or equal to msg.value
        if (_nativeAmount > 0 && _nativeAmount <= msg.value) {
            payable(_refundAddress).transfer(_nativeAmount);
        }
    }

    /**
     * @notice deposits $NOTE to the correct asd vault to receive ASD tokens
     * @param _asdVault The address of the ASD vault to deposit to
     * @param _amountNote The amount of $NOTE to deposit
     */
    function _depositNoteToASDVault(address _asdVault, uint _amountNote) internal returns (bool, string memory) {
        // approve asd vault to spend $NOTE
        IERC20(noteAddress).approve(_asdVault, _amountNote);
        // deposit $NOTE to asd vault (use call, so this doesn't revert)
        (bool success, bytes memory errReason) = _asdVault.call(abi.encodeWithSelector(ASDOFT.mint.selector, _amountNote));
        return (success, string(errReason));
    }

    /**
     * @notice swaps an OFT stable coin for $NOTE
     * @dev only callable by the owner
     * @param _oftAddress The address of the OFT stable coin contract
     * @param _amount The amount of OFT stable coin to swap
     * @param _minAmountNote The minimum amount of $NOTE to receive
     * @return amount The amount of $NOTE received or error code
     */
    function _swapOFTForNote(address _oftAddress, uint _amount, uint _minAmountNote) internal returns (uint amount, bool success) {
        if (_amount < _minAmountNote) {
            amount = 0;
            success = false;
        } else {
            amount = _amount;
            success = true;
        }
    }
}
