// SPDX-License-Identifier: MIT
pragma solidity 0.8.12;
pragma abicoder v2;

import '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';
import '@openzeppelin/contracts/utils/math/SafeMath.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@openzeppelin/contracts/utils/structs/EnumerableSet.sol';
import '@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol';
import '@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol';

import '../interfaces/IChefIncentivesController.sol';
import '../interfaces/IMultiFeeDistribution.sol';

interface IMintableToken is IERC20 {
  function mint(address _receiver, uint256 _amount) external returns (bool);

  function setMinter(address _minter) external returns (bool);
}

contract MultiFeeDistribution is IMultiFeeDistribution, Initializable, PausableUpgradeable, OwnableUpgradeable {
  using SafeMath for uint256;
  using SafeERC20 for IERC20;
  using SafeERC20 for IMintableToken;
  using EnumerableSet for EnumerableSet.AddressSet;

  event Locked(address indexed user, uint256 amount);
  event WithdrawnExpiredLocks(address indexed user, uint256 amount);
  event Minted(address indexed user, uint256 amount);
  event ExitedEarly(address indexed user, uint256 amount, uint256 penaltyAmount);
  event Withdrawn(address indexed user, uint256 amount);
  event RewardPaid(address indexed user, address indexed rewardsToken, uint256 reward);
  event PublicExit();

  struct Reward {
    uint256 periodFinish;
    uint256 rewardRate;
    uint256 lastUpdateTime;
    uint256 rewardPerTokenStored;
    uint256 balance;
  }
  struct Balances {
    uint256 locked; // balance lock tokens
    uint256 earned; // balance reward tokens earned
  }
  struct LockedBalance {
    uint256 amount;
    uint256 unlockTime;
  }
  struct RewardData {
    address token;
    uint256 amount;
  }

  uint256 public constant rewardsDuration = 86400 * 7; // reward interval 7 days;
  uint256 public constant rewardLookback = 86400;
  uint256 public constant lockDuration = rewardsDuration * 8; // 56 days
  uint256 public constant vestingDuration = rewardsDuration * 4; // 28 days

  // Addresses approved to call mint
  EnumerableSet.AddressSet private minters;

  // user -> reward token -> amount
  mapping(address => mapping(address => uint256)) public userRewardPerTokenPaid;
  mapping(address => mapping(address => uint256)) public rewards;

  IChefIncentivesController public incentivesController;
  IERC20 public stakingToken;
  IMintableToken public rewardToken;
  address public treasury;
  address public teamRewardVault;
  uint256 public teamRewardFee; // 1% = 100
  address[] public rewardTokens;
  mapping(address => Reward) public rewardData;

  uint256 public lockedSupply;
  bool public publicExitAreSet;

  // Private mappings for balance data
  mapping(address => Balances) private balances;
  mapping(address => LockedBalance[]) private userLocks; // stake LP tokens
  mapping(address => LockedBalance[]) private userEarnings; // vesting Vinium tokens
  mapping(address => address) public exitDelegatee;

  function initialize(IERC20 _stakingToken, IMintableToken _rewardToken) public initializer {
    __Pausable_init();
    __Ownable_init();

    stakingToken = _stakingToken;
    rewardToken = _rewardToken;
    rewardTokens.push(address(_rewardToken));
    rewardData[address(_rewardToken)].lastUpdateTime = block.timestamp;
    rewardData[address(_rewardToken)].periodFinish = block.timestamp;
    teamRewardFee = 2000;
  }

  function setTreasury(address _treasury) external onlyOwner {
    treasury = _treasury;
  }

  function setTeamRewardVault(address vault) external onlyOwner {
    teamRewardVault = vault;
  }

  function setTeamRewardFee(uint256 fee) external onlyOwner {
    require(fee <= 10000, 'fee too high');
    teamRewardFee = fee;
  }

  function getMinters() external view returns (address[] memory) {
    return minters.values();
  }

  function setMinters(address[] calldata _minters) external onlyOwner {
    delete minters;
    for (uint256 i = 0; i < _minters.length; i++) {
      minters.add(_minters[i]);
    }
  }

  function setIncentivesController(IChefIncentivesController _controller) external onlyOwner {
    incentivesController = _controller;
  }

  // Add a new reward token to be distributed to stakers
  function addReward(address _rewardsToken) external onlyOwner {
    require(rewardData[_rewardsToken].lastUpdateTime == 0);
    rewardTokens.push(_rewardsToken);
    rewardData[_rewardsToken].lastUpdateTime = block.timestamp;
    rewardData[_rewardsToken].periodFinish = block.timestamp;
  }

  // Information on a user's locked balances
  function lockedBalances(address user) external view returns (uint256 total, uint256 unlockable, uint256 locked, LockedBalance[] memory lockData) {
    LockedBalance[] storage locks = userLocks[user];
    uint256 idx;
    for (uint256 i = 0; i < locks.length; i++) {
      if (locks[i].unlockTime > block.timestamp) {
        if (idx == 0) {
          lockData = new LockedBalance[](locks.length - i);
        }
        lockData[idx] = locks[i];
        idx++;
        locked = locked.add(locks[i].amount);
      } else {
        unlockable = unlockable.add(locks[i].amount);
      }
    }
    return (balances[user].locked, unlockable, locked, lockData);
  }

  // Information on the "earned" balances of a user
  function earnedBalances(address user) external view returns (uint256 total, LockedBalance[] memory earningsData) {
    LockedBalance[] storage earnings = userEarnings[user];
    uint256 idx;
    for (uint256 i = 0; i < earnings.length; i++) {
      if (earnings[i].unlockTime > block.timestamp) {
        if (idx == 0) {
          earningsData = new LockedBalance[](earnings.length - i);
        }
        earningsData[idx] = earnings[i];
        idx++;
        total = total.add(earnings[i].amount);
      }
    }
    return (total, earningsData);
  }

  function withdrawableBalance(address user) public view returns (uint256 amount, uint256 penaltyAmount, uint256 treausryAmount) {
    Balances storage bal = balances[user];
    uint256 earned = bal.earned;
    if (earned > 0) {
      uint256 amountWithoutPenalty;
      uint256 length = userEarnings[user].length;
      for (uint256 i = 0; i < length; i++) {
        uint256 earnedAmount = userEarnings[user][i].amount;
        if (earnedAmount == 0) continue;
        if (userEarnings[user][i].unlockTime > block.timestamp) {
          break;
        }
        amountWithoutPenalty = amountWithoutPenalty.add(earnedAmount);
      }
      penaltyAmount = earned.sub(amountWithoutPenalty).div(2);
      treausryAmount = penaltyAmount.mul(2).div(5);
    }
    // amount = earned.sub(penaltyAmount);
    amount = earned.sub(penaltyAmount).sub(treausryAmount);
  }

  // Address and claimable amount of all reward tokens for the given account
  function claimableRewards(address account) external view returns (RewardData[] memory) {
    RewardData[] memory rewards = new RewardData[](rewardTokens.length);
    for (uint256 i = 0; i < rewards.length; i++) {
      rewards[i].token = rewardTokens[i];
      rewards[i].amount = _earned(account, rewards[i].token, balances[account].locked, _rewardPerToken(rewardTokens[i], lockedSupply)).div(1e12);
    }
    return rewards;
  }

  // Lock tokens to receive rewards
  // Locked tokens cannot be withdrawn for lockDuration and are eligible to receive stakingReward rewards
  function lock(uint256 amount, address onBehalfOf) external whenNotPaused {
    require(amount > 0, 'amount = 0');
    _updateReward(onBehalfOf);
    Balances storage bal = balances[onBehalfOf];
    lockedSupply = lockedSupply.add(amount);
    bal.locked = bal.locked.add(amount);
    uint256 unlockTime = block.timestamp.div(rewardsDuration).mul(rewardsDuration).add(lockDuration);
    uint256 idx = userLocks[onBehalfOf].length;
    if (idx == 0 || userLocks[onBehalfOf][idx - 1].unlockTime < unlockTime) {
      userLocks[onBehalfOf].push(LockedBalance({amount: amount, unlockTime: unlockTime}));
    } else {
      userLocks[onBehalfOf][idx - 1].amount = userLocks[onBehalfOf][idx - 1].amount.add(amount);
    }
    stakingToken.safeTransferFrom(msg.sender, address(this), amount);
    emit Locked(onBehalfOf, amount);
  }

  // Withdraw all currently locked tokens where the unlock time has passed
  function withdrawExpiredLocks() external whenNotPaused {
    _updateReward(msg.sender);
    LockedBalance[] storage locks = userLocks[msg.sender];
    Balances storage bal = balances[msg.sender];
    uint256 amount;
    uint256 length = locks.length;
    if (locks[length - 1].unlockTime <= block.timestamp || publicExitAreSet) {
      amount = bal.locked;
      delete userLocks[msg.sender];
    } else {
      for (uint256 i = 0; i < length; i++) {
        if (locks[i].unlockTime > block.timestamp) break;
        amount = amount.add(locks[i].amount);
        delete locks[i];
      }
    }
    require(amount > 0, 'amount = 0');
    bal.locked = bal.locked.sub(amount);
    lockedSupply = lockedSupply.sub(amount);
    stakingToken.safeTransfer(msg.sender, amount);
    emit WithdrawnExpiredLocks(msg.sender, amount);
  }

  function mint(address user, uint256 amount) external whenNotPaused {
    require(minters.contains(msg.sender), '!minter');
    if (amount == 0) return;
    _updateReward(user);
    rewardToken.mint(address(this), amount);
    if (user == address(this)) {
      // minting to this contract adds the new tokens as incentives for lockers
      _notifyReward(address(rewardToken), amount);
      return;
    }
    Balances storage bal = balances[user];
    bal.earned = bal.earned.add(amount);
    uint256 unlockTime = block.timestamp.div(rewardsDuration).mul(rewardsDuration).add(vestingDuration);
    LockedBalance[] storage earnings = userEarnings[user];
    uint256 idx = earnings.length;
    if (idx == 0 || earnings[idx - 1].unlockTime < unlockTime) {
      earnings.push(LockedBalance({amount: amount, unlockTime: unlockTime}));
    } else {
      earnings[idx - 1].amount = earnings[idx - 1].amount.add(amount);
    }
    emit Minted(user, amount);
  }

  // Delegate exit
  function delegateExit(address delegatee) external {
    exitDelegatee[msg.sender] = delegatee;
  }

  // Withdraw full unlocked balance and optionally claim pending rewards
  function exitEarly(address onBehalfOf) external whenNotPaused {
    require(onBehalfOf == msg.sender || exitDelegatee[onBehalfOf] == msg.sender);
    _updateReward(onBehalfOf);
    (uint256 amount, uint256 penaltyAmount, uint256 treasuryAmount) = withdrawableBalance(onBehalfOf);
    delete userEarnings[onBehalfOf];
    Balances storage bal = balances[onBehalfOf];
    bal.earned = 0;
    rewardToken.safeTransfer(onBehalfOf, amount);
    rewardToken.safeTransfer(treasury, treasuryAmount);
    if (penaltyAmount > 0) {
      incentivesController.claim(address(this), new address[](0));
      _notifyReward(address(rewardToken), penaltyAmount);
    }
    emit ExitedEarly(onBehalfOf, amount, penaltyAmount);
  }

  // Withdraw staked tokens
  function withdraw() public whenNotPaused {
    _updateReward(msg.sender);
    Balances storage bal = balances[msg.sender];
    if (bal.earned > 0) {
      uint256 amount;
      uint256 length = userEarnings[msg.sender].length;
      if (userEarnings[msg.sender][length - 1].unlockTime <= block.timestamp) {
        amount = bal.earned;
        delete userEarnings[msg.sender];
      } else {
        for (uint256 i = 0; i < length; i++) {
          uint256 earnedAmount = userEarnings[msg.sender][i].amount;
          if (earnedAmount == 0) continue;
          if (userEarnings[msg.sender][i].unlockTime > block.timestamp) {
            break;
          }
          amount = amount.add(earnedAmount);
          delete userEarnings[msg.sender][i];
        }
      }
      if (amount > 0) {
        bal.earned = bal.earned.sub(amount);
        rewardToken.safeTransfer(msg.sender, amount);
        emit Withdrawn(msg.sender, amount);
      }
    }
  }

  // Transfer rewards to wallet
  function getReward(address[] memory _rewardTokens) public {
    _updateReward(msg.sender);
    _getReward(_rewardTokens);
  }

  function lastTimeRewardApplicable(address _rewardsToken) public view returns (uint256) {
    uint256 periodFinish = rewardData[_rewardsToken].periodFinish;
    return block.timestamp < periodFinish ? block.timestamp : periodFinish;
  }

  function _getReward(address[] memory _rewardTokens) internal whenNotPaused {
    uint256 length = _rewardTokens.length;
    for (uint256 i; i < length; i++) {
      address token = _rewardTokens[i];
      uint256 reward = rewards[msg.sender][token].div(1e12);
      if (token != address(rewardToken)) {
        // for rewards other than rewardToken, every 24 hours we check if new
        // rewards were sent to the contract or accrued via uToken interest
        Reward storage r = rewardData[token];
        uint256 periodFinish = r.periodFinish;
        require(periodFinish > 0, 'Unknown reward token');
        uint256 balance = r.balance;
        if (periodFinish < block.timestamp.add(rewardsDuration - rewardLookback)) {
          uint256 unseen = IERC20(token).balanceOf(address(this)).sub(balance);
          if (unseen > 0) {
            uint256 adjustedAmount = _adjustReward(token, unseen);
            _notifyReward(token, adjustedAmount);
            balance = balance.add(adjustedAmount);
          }
        }
        r.balance = balance.sub(reward);
      }
      if (reward == 0) continue;
      rewards[msg.sender][token] = 0;
      IERC20(token).safeTransfer(msg.sender, reward);
      emit RewardPaid(msg.sender, token, reward);
    }
  }

  function _rewardPerToken(address _rewardsToken, uint256 _supply) internal view returns (uint256) {
    if (_supply == 0) {
      return rewardData[_rewardsToken].rewardPerTokenStored;
    }
    return
      rewardData[_rewardsToken].rewardPerTokenStored.add(
        lastTimeRewardApplicable(_rewardsToken).sub(rewardData[_rewardsToken].lastUpdateTime).mul(rewardData[_rewardsToken].rewardRate).mul(1e18).div(
          _supply
        )
      );
  }

  function _earned(address _user, address _rewardsToken, uint256 _balance, uint256 _currentRewardPerToken) internal view returns (uint256) {
    return _balance.mul(_currentRewardPerToken.sub(userRewardPerTokenPaid[_user][_rewardsToken])).div(1e18).add(rewards[_user][_rewardsToken]);
  }

  function _notifyReward(address _rewardsToken, uint256 reward) internal {
    Reward storage r = rewardData[_rewardsToken];
    if (block.timestamp >= r.periodFinish) {
      r.rewardRate = reward.mul(1e12).div(rewardsDuration);
    } else {
      uint256 remaining = r.periodFinish.sub(block.timestamp);
      uint256 leftover = remaining.mul(r.rewardRate).div(1e12);
      r.rewardRate = reward.add(leftover).mul(1e12).div(rewardsDuration);
    }
    r.lastUpdateTime = block.timestamp;
    r.periodFinish = block.timestamp.add(rewardsDuration);
  }

  function _updateReward(address account) internal {
    uint256 length = rewardTokens.length;
    for (uint256 i = 0; i < length; i++) {
      address token = rewardTokens[i];
      Reward storage r = rewardData[token];
      uint256 rpt = _rewardPerToken(token, lockedSupply);
      r.rewardPerTokenStored = rpt;
      r.lastUpdateTime = lastTimeRewardApplicable(token);
      if (account != address(this)) {
        rewards[account][token] = _earned(account, token, balances[account].locked, rpt);
        userRewardPerTokenPaid[account][token] = rpt;
      }
    }
  }

  function _adjustReward(address _rewardsToken, uint256 reward) internal returns (uint256 adjustedAmount) {
    if (reward > 0 && teamRewardVault != address(0) && _rewardsToken != address(rewardToken)) {
      uint256 feeAmount = reward.mul(teamRewardFee).div(10000);
      adjustedAmount = reward.sub(feeAmount);
      if (feeAmount > 0) {
        IERC20(_rewardsToken).safeTransfer(teamRewardVault, feeAmount);
      }
    } else {
      adjustedAmount = reward;
    }
  }

  function publicExit() external onlyOwner {
    require(!publicExitAreSet, 'public exit are set');
    publicExitAreSet = true;
    emit PublicExit();
  }

  function pause() public onlyOwner {
    _pause();
  }

  function unpause() public onlyOwner {
    _unpause();
  }
}
