pragma solidity 0.8.12;

interface IMultiFeeDistribution {
  function addReward(address rewardsToken) external;

  function mint(address user, uint256 amount, bool withPenalty) external;
}
