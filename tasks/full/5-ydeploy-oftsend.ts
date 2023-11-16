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

task('full:deploy-oft-send', 'Deploy Incentive Controller')
  .addFlag('verify', 'Verify contracts at Etherscan')
  .addParam('pool', `Pool name to retrieve configuration, supported: ${Object.values(ConfigNames)}`)
  .addParam('targetnetwork', 'Target Network')
  .setAction(async ({ verify, pool, targetnetwork }, localBRE) => {
    try {
      await localBRE.run('set-DRE');
      const network = <eNetwork>localBRE.network.name;
      const poolConfig = loadPoolConfig(pool);
      const { OFTTokenAddress, OFTEndpoint, OFTTreasury } = poolConfig as ICommonConfiguration;

      let oftEndpoint = await getParamPerNetwork(OFTEndpoint, network);
      let oftTreasury = await getParamPerNetwork(OFTTreasury, network);

      let localAddress = await getParamPerNetwork(OFTTokenAddress, network);
      if (!notFalsyOrZeroAddress(localAddress)) {
        const OFTTokenAddress = await deployOFTToken(
          ['ViniumOFT', 'ViniumOFT', oftEndpoint!, oftTreasury!, oftTreasury!, ethers.utils.parseEther('100000').toString()],
          verify
        );
        localAddress = OFTTokenAddress.address;
      }
      console.log('localAddress :>> ', localAddress);

      let remoteChainId = OFTChains[targetnetwork];
      let remoteAddress = await getParamPerNetwork(OFTTokenAddress, targetnetwork);

      console.log('remoteAddress :>> ', remoteAddress);

      const owner = await getFirstSigner();
      const ownerAddr = await owner.getAddress();

      const localContract = await ViniumOFTFactory.connect(localAddress!, await getFirstSigner());

      const toAddressBytes32 = ethers.utils.defaultAbiCoder.encode(['address'], ['0x1D68EF2f0c12cDeb996A598967d9365c5E09bFAC']);
      const qty = parseEther('0.50000001'); // 1 ether
      let adapterParams = ethers.utils.solidityPack(['uint16', 'uint256'], [1, 200000]);

      let fees = await localContract.estimateSendFee(remoteChainId, toAddressBytes32, qty, false, adapterParams);

      console.log(`fees[0] (wei): ${fees[0]} / (eth): ${formatEther(fees[0])}`);

      let tx = await (
        await localContract.sendFrom(
          ownerAddr,
          remoteChainId,
          toAddressBytes32,
          qty,
          { refundAddress: ownerAddr, zroPaymentAddress: ethers.constants.AddressZero, adapterParams },
          { value: fees[0] }
        )
      ).wait();

      console.log(
        `✅ Message Sent [${network}] sendTokens() to OFT @ LZ chainId[${remoteChainId}] token: 0x1D68EF2f0c12cDeb996A598967d9365c5E09bFAC`
      );
      console.log(` tx: ${tx.transactionHash}`);
      console.log(`* check your address [${ownerAddr}] on the destination chain, in the ERC20 transaction tab !"`);
    } catch (err) {
      console.error(err);
      exit(1);
    }
  });
