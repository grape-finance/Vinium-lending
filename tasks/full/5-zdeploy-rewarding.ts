import { task } from 'hardhat/config';
import hre from 'hardhat';
import { getParamPerNetwork } from '../../helpers/contracts-helpers';
import {
  deployLendingPoolCollateralManager,
  deployWalletBalancerProvider,
  authorizeWETHGateway,
  deployUiPoolDataProviderV2,
  deployOFTToken,
  deployLiquidityZap,
  deployUniswapPoolHelper,
  deployLockZap,
  deployPriceProvider,
  deployLockerList,
  deployMultiFeeDistribution,
  deployMiddleFeeDistribution,
  deployChefIncentivesController,
  deployEligibilityDataProvider,
  deployLendingPoolAddressesProvider,
  upgradeChefIncentivesController,
} from '../../helpers/contracts-deployments';
import { loadPoolConfig, ConfigNames, getTreasuryAddress } from '../../helpers/configuration';
import { getFirstSigner, getWETHGateway } from '../../helpers/contracts-getters';
import { eNetwork, ICommonConfiguration } from '../../helpers/types';
import { DRE, notFalsyOrZeroAddress, waitForTx } from '../../helpers/misc-utils';
import { exit } from 'process';
import { chainlinkAggregatorProxy, chainlinkEthUsdAggregatorProxy } from '../../helpers/constants';
import { ethers } from 'ethers';
import { ChefIncentivesControllerFactory, MultiFeeDistributionFactory } from '../../types';

task('full:deploy-incentive-controller', 'Deploy Incentive Controller')
  .addFlag('verify', 'Verify contracts at Etherscan')
  .addParam('pool', `Pool name to retrieve configuration, supported: ${Object.values(ConfigNames)}`)
  .setAction(async ({ verify, pool }, localBRE) => {
    try {
      await localBRE.run('set-DRE');
      const network = <eNetwork>localBRE.network.name;
      const poolConfig = loadPoolConfig(pool);
      const {
        OFTTokenAddress,
        OFTEndpoint,
        OFTTreasury,
        LiquidityZap,
        UniswapPoolHelper,
        LockZap,
        PriceProvider,
        LockerList,
        MultiFeeDistribution,
        MiddleFeeDistribution,
        EligibilityDataProvider,
        IncentivesController,
        WETH,
        LendingPool,
        ViniumOracle,
        LendingPoolConfigurator,
        ChainlinkAggregator,
      } = poolConfig as ICommonConfiguration;

      let oftEndpoint = await getParamPerNetwork(OFTEndpoint, network);
      let oftTreasury = await getParamPerNetwork(OFTTreasury, network);
      // let wETH = await getParamPerNetwork(WETH, network);
      // let lendingPool = await getParamPerNetwork(LendingPool, network);
      let lendingPoolConfigurator = await getParamPerNetwork(LendingPoolConfigurator, network);
      // let viniumOracle = await getParamPerNetwork(ViniumOracle, network);
      // let chainlinkAggregator = await getParamPerNetwork(ChainlinkAggregator, network);

      let oftTokenAddress = await getParamPerNetwork(OFTTokenAddress, network);
      if (!notFalsyOrZeroAddress(oftTokenAddress)) {
        const OFTTokenAddress = await deployOFTToken(
          ['ViniumOFT', 'ViniumOFT', oftEndpoint!, oftTreasury!, oftTreasury!, ethers.utils.parseEther('100000').toString()],
          verify
        );
        oftTokenAddress = OFTTokenAddress.address;
      }
      console.log('oftTokenAddress :>> ', oftTokenAddress);

      const ViniumETHLP = '0xa8e21cbe7c32cb2131a1a25c56042e2dd4f1b1ce';

      let multiFeeDistribution = await getParamPerNetwork(MultiFeeDistribution, network);
      if (!notFalsyOrZeroAddress(multiFeeDistribution)) {
        const MultiFeeDistribution = await deployMultiFeeDistribution([ViniumETHLP, oftTokenAddress!], verify);
        multiFeeDistribution = MultiFeeDistribution.address;
      }
      console.log('MultiFeeDistribution :>> ', multiFeeDistribution);

      const startTimeOffset = ['0', '15552000', '18144000', '20736000', '23328000', '25920000', '28512000', '31536000', '63072000', '94608000'];
      const rewardsPerSecond = [
        '38580246913580240',
        '38580246913580240',
        '38580246913580240',
        '38580246913580240',
        '38580246913580240',
        '38580246913580240',
        '38580246913580240',
        '63419583967529170',
        '63419583967529170',
        '63419583967529170',
      ];

      let incentivesController = await getParamPerNetwork(IncentivesController, network);
      if (!notFalsyOrZeroAddress(incentivesController)) {
        const IncentivesController = await deployChefIncentivesController(
          [startTimeOffset, rewardsPerSecond, lendingPoolConfigurator!, multiFeeDistribution!, ethers.utils.parseEther('400000000')],
          verify
        );
        incentivesController = IncentivesController.address;
      }
      console.log('incentivesController :>> ', incentivesController);

      // const ChefIncentivesController = ChefIncentivesControllerFactory.connect(incentivesController, await getFirstSigner());
      // await ChefIncentivesController.changeEmissionSchedule(startTimeOffset, rewardsPerSecond);
    } catch (err) {
      console.error(err);
      exit(1);
    }
  });
