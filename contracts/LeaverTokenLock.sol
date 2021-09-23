// SPDX-License-Identifier: MIT

pragma solidity ^0.8.7;

import "./TokenLock.sol";

contract LeaverTokenLock is TokenLock {
    using SafeERC20 for IERC20;

    enum LeaverType {
        None,
        GoodLeaver,
        BadLeaver
    }

    event LogLeave(address indexed leaver, LeaverType leaverType, uint256 newTotalStake);

    // part of the accumulated tokens that stays with bad leaver
    uint256 internal constant BAD_LEAVER_DIVISOR = 10;

    // part of the tokens accumulated in the future that stays with the good leaver
    uint256 internal constant GOOD_LEAVER_DIVISOR = 2;

    // manager address that can execute leave method
    address internal _manager;

    // information on leavers
    mapping(address => LeaverType) internal _leavers;

    modifier onlyManager() {
        require(msg.sender == _manager, "Only manager");
        _;
    }

    modifier onlyNonLeaver(address wallet) {
        require(_leavers[wallet] == LeaverType.None, "Specified wallet already left");
        _;
    }

    constructor(
        IERC20 token_,
        uint256 startTime_,
        uint256 vestingPeriod_,
        address manager_,
        address[] memory wallets_,
        uint128[] memory amounts_
    ) TokenLock(token_, startTime_, vestingPeriod_, 0, 0, wallets_, amounts_) {
        _manager = manager_;
    }

    function managerAddress() public view returns (address) {
        return _manager;
    }

    function hasLeaved(address wallet) public view returns (LeaverType) {
        return _leavers[wallet];
    }

    function leaveWallet(address wallet, bool isBadLeaver) public onlyManager onlyFunded onlyNonLeaver(wallet) {
        require(msg.sender != wallet, "Manager cannot leave");

        UnlockState memory stake = _stakes[wallet];
        uint256 tokensVestedSoFar = tokensVestedInternal(stake.totalTokens, block.timestamp);
        uint256 accumulatedSoFar = tokensAccumulatedInternal(stake.totalTokens, block.timestamp);
        uint256 newTotalStake = 0;

        if (isBadLeaver) {
            // bad leavers keep what was released as tokens cannot be taken back and keeps 10% of accumulated max
            newTotalStake = Math.max(tokensVestedSoFar, accumulatedSoFar / BAD_LEAVER_DIVISOR);
        } else {
            // 50% of what will be accumulated if not bad leaver
            newTotalStake = accumulatedSoFar + (stake.totalTokens - accumulatedSoFar) / GOOD_LEAVER_DIVISOR;
        }

        // return unlocked tokens
        uint256 unlockAmount = tokensVestedSoFar - stake.unlockedTokens;
        if (unlockAmount > 0) {
            // this should never happen
            assert(stake.totalTokens >= stake.unlockedTokens + unlockAmount);

            // if anything was unlocked - book it
            _stakes[wallet].unlockedTokens += unlockAmount;

            // send the original wallet what is now due
            token().safeTransfer(wallet, unlockAmount);
            emit LogRelease(wallet, unlockAmount);
        }

        // set new stake for leaver
        // total stake in the contract must be invariant
        // we take (stake.totalTokens - newTotalStake) from _stakes[wallet].totalTokens (leaver stake)
        _stakes[wallet].totalTokens = newTotalStake;
        // and add it to the manager stake
        _stakes[msg.sender].totalTokens += (stake.totalTokens - newTotalStake);

        // mark wallet left
        LeaverType leaverType = isBadLeaver ? LeaverType.BadLeaver : LeaverType.GoodLeaver;
        _leavers[wallet] = leaverType;

        emit LogLeave(wallet, leaverType, newTotalStake);
    }

    function tokensAccumulated(address sender, uint256 timestamp) public view returns (uint256 accumulatedTokens) {
        return tokensAccumulatedInternal(_stakes[sender].totalTokens, timestamp);
    }

    function tokensAccumulatedInternal(uint256 totalTokens, uint256 timestamp)
        internal
        view
        returns (uint256 accumulatedTokens)
    {
        // accumulation period starts "vestingPeriod" before startTime
        uint256 accStartTime = _startTime - _vestingPeriod;
        if (timestamp >= accStartTime) {
            // and lasts 2 * _vestingPeriod
            uint256 accPeriod = 2 * _vestingPeriod;
            uint256 timeAccSoFar = Math.min(timestamp - accStartTime, accPeriod);
            // mul first for best precision, v.8 compiler reverts on overflows
            accumulatedTokens = (totalTokens * timeAccSoFar) / accPeriod;
        }
    }
}
