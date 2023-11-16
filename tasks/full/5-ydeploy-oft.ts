import { task } from 'hardhat/config';
import hre from 'hardhat';
import { getContract, getParamPerNetwork, verifyContract, withSaveAndVerify } from '../../helpers/contracts-helpers';
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
  upgradeMultiFeeDistribution,
} from '../../helpers/contracts-deployments';
import { loadPoolConfig, ConfigNames, getTreasuryAddress } from '../../helpers/configuration';
import { getFirstSigner, getWETHGateway } from '../../helpers/contracts-getters';
import { eNetwork, ICommonConfiguration } from '../../helpers/types';
import { DRE, notFalsyOrZeroAddress, waitForTx } from '../../helpers/misc-utils';
import { exit } from 'process';
import { OFTChains, chainlinkAggregatorProxy, chainlinkEthUsdAggregatorProxy } from '../../helpers/constants';
import { ethers } from 'ethers';
import { ChefIncentivesControllerFactory, MultiFeeDistributionFactory, ViniumOFTFactory } from '../../types';
import { formatEther, parseEther } from 'ethers/lib/utils';

task('full:deploy-oft', 'Deploy Incentive Controller')
  .addFlag('verify', 'Verify contracts at Etherscan')
  .addParam('pool', `Pool name to retrieve configuration, supported: ${Object.values(ConfigNames)}`)
  .addParam('targetnetwork', 'Target Network')
  .setAction(async ({ verify, pool, targetnetwork }, localBRE) => {
    try {
      await localBRE.run('set-DRE');
      const network = <eNetwork>localBRE.network.name;
      const poolConfig = loadPoolConfig(pool);
      const { OFTTokenAddress, OFTEndpoint, OFTTreasury } = poolConfig as ICommonConfiguration;

      let lzEndpoint = await getParamPerNetwork(OFTEndpoint, network);
      let oftTreasury = await getParamPerNetwork(OFTTreasury, network);

      let localAddress = await getParamPerNetwork(OFTTokenAddress, network);
      if (!notFalsyOrZeroAddress(localAddress)) {
        const OFTTokenAddress = await deployOFTToken(
          ['ViniumOFT', 'ViniumOFT', lzEndpoint!, oftTreasury!, oftTreasury!, ethers.utils.parseEther('100000').toString()],
          verify
        );
        localAddress = OFTTokenAddress.address;
      }
      console.log('localAddress :>> ', localAddress);

      let remoteChainId = OFTChains[targetnetwork];
      let remoteAddress = await getParamPerNetwork(OFTTokenAddress, targetnetwork);

      console.log('remoteAddress :>> ', remoteAddress);

      let remoteAndLocal = ethers.utils.solidityPack(['address', 'address'], [remoteAddress, localAddress]);

      /**********  Configure Bridge  *************/

      const localContract = await ViniumOFTFactory.connect(localAddress!, await getFirstSigner());
      const isTrustedRemoteSet = await localContract.isTrustedRemote(remoteChainId, remoteAndLocal);
      if (!isTrustedRemoteSet) {
        let tx = await (await localContract.setTrustedRemote(remoteChainId, remoteAndLocal)).wait(); // for A, set B
        console.log(`✅ [${localBRE.network.name}] setTrustedRemote(${remoteChainId}, ${remoteAndLocal})`);
        console.log(` tx: ${tx.transactionHash}`);
      }

      await localContract.setMinDstGas(remoteChainId, 0, 200000);
      await localContract.setMinDstGas(remoteChainId, 1, 200000);
    } catch (err) {
      console.error(err);
      exit(1);
    }
  });
