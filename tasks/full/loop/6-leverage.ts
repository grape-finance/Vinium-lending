import { task } from 'hardhat/config';
import { deployLeverager, deployViniumProtocolDataProvider } from '../../../helpers/contracts-deployments';
import { exit } from 'process';
import { getFirstSigner, getLendingPoolAddressesProvider } from '../../../helpers/contracts-getters';
import { ConfigNames, loadPoolConfig } from '../../../helpers/configuration';
import { ICommonConfiguration, eNetwork } from '../../../helpers/types';
import { getParamPerNetwork } from '../../../helpers/contracts-helpers';
import { notFalsyOrZeroAddress } from '../../../helpers/misc-utils';
import { LeveragerFactory, MintableDelegationERC20Factory, VariableVdTokenFactory } from '../../../types';
import { ethers } from 'ethers';

task('full:deploy-leverager', 'Initialize lending pool configuration.')
  .addFlag('verify', 'Verify contracts at Etherscan')
  .addParam('pool', `Pool name to retrieve configuration, supported: ${Object.values(ConfigNames)}`)
  .setAction(async ({ verify, pool }, localBRE) => {
    try {
      await localBRE.run('set-DRE');
      const network = <eNetwork>localBRE.network.name;
      const poolConfig = loadPoolConfig(pool);

      const { LendingPool, Leverager } = poolConfig as ICommonConfiguration;

      let lendingPoolAddr = await getParamPerNetwork(LendingPool, network);
      let leverager = await getParamPerNetwork(Leverager, network);

      if (!notFalsyOrZeroAddress(leverager)) {
        const Leverager = await deployLeverager(lendingPoolAddr, verify);
        leverager = Leverager.address;
      }

      // console.log('leverager :>> ', leverager);

      const ERC20Addr = '0x0B3924aBe2A9856e9b685c7788d15fFD465C3Dd4';
      // const ERC20Contract = await MintableDelegationERC20Factory.connect(ERC20Addr, await getFirstSigner());
      // await ERC20Contract.approve(leverager, ethers.constants.MaxInt256);

      // console.log('approved');

      const leveragerContract = await LeveragerFactory.connect(leverager, await getFirstSigner());

      const debtToken = await leveragerContract.getVDebtToken(ERC20Addr);
      console.log('debtToken :>> ', debtToken);
      const debtTokenContract = await VariableVdTokenFactory.connect(debtToken, await getFirstSigner());

      // let tx = await debtTokenContract.approveDelegation(leveragerContract.address, ethers.constants.MaxInt256);
      // await tx.wait();
      console.log('approveDelegate');

      let tx = await leveragerContract.loop(ERC20Addr, ethers.utils.parseUnits('100', 6), 2, 5000, 2);
      await tx.wait();
      console.log('loop');
    } catch (err) {
      console.error(err);
      exit(1);
    }
  });
