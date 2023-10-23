import { task } from 'hardhat/config';
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
  deployBaseOracle,
  deployUniV2TwapOracle,
} from '../../helpers/contracts-deployments';
import { loadPoolConfig, ConfigNames, getTreasuryAddress } from '../../helpers/configuration';
import { getFirstSigner, getWETHGateway } from '../../helpers/contracts-getters';
import { eNetwork, ICommonConfiguration } from '../../helpers/types';
import { notFalsyOrZeroAddress, waitForTx } from '../../helpers/misc-utils';
import { exit } from 'process';
import { chainlinkAggregatorProxy, chainlinkEthUsdAggregatorProxy } from '../../helpers/constants';
import { ethers } from 'ethers';
import { LendingPoolConfiguratorFactory, MultiFeeDistributionFactory, ViniumOFTFactory, WETH9Factory } from '../../types';

task('full:initialize-incentive-controller', 'Deploy Incentive Controller')
  .addFlag('verify', 'Verify contracts at Etherscan')
  .addParam('pool', `Pool name to retrieve configuration, supported: ${Object.values(ConfigNames)}`)
  .setAction(async ({ verify, pool }, localBRE) => {
    try {
      await localBRE.run('set-DRE');
      const network = <eNetwork>localBRE.network.name;
      const poolConfig = loadPoolConfig(pool);
      const { OFTTokenAddress, OFTTreasury, MultiFeeDistribution, IncentivesController, WETH, LendingPool, LendingPoolConfigurator } =
        poolConfig as ICommonConfiguration;

      let oftTreasury = await getParamPerNetwork(OFTTreasury, network);
      let oftTokenAddress = await getParamPerNetwork(OFTTokenAddress, network);
      let multiFeeDistribution = await getParamPerNetwork(MultiFeeDistribution, network);
      let incentivesController = await getParamPerNetwork(IncentivesController, network);

      const OFTTokenContract = await ViniumOFTFactory.connect(oftTokenAddress!, await getFirstSigner());
      const MultiFeeDistributionContract = await MultiFeeDistributionFactory.connect(multiFeeDistribution!, await getFirstSigner());

      console.log('multiFeeDistribution :>> ', multiFeeDistribution);
      console.log('incentivesController :>> ', incentivesController);
      // await OFTTokenContract.setMinter(multiFeeDistribution!);
      await MultiFeeDistributionContract.setMinters([oftTreasury!, incentivesController!]);
      // await MultiFeeDistributionContract.setIncentivesController(incentivesController!);
    } catch (err) {
      console.error(err);
      exit(1);
    }
  });
