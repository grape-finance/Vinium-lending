import { task } from 'hardhat/config';
import { deployLeverager, deployViniumProtocolDataProvider } from '../../helpers/contracts-deployments';
import { exit } from 'process';
import { getFirstSigner, getLendingPoolAddressesProvider } from '../../helpers/contracts-getters';
import { ConfigNames, loadPoolConfig } from '../../helpers/configuration';
import { ICommonConfiguration, eNetwork } from '../../helpers/types';
import { getParamPerNetwork } from '../../helpers/contracts-helpers';
import { notFalsyOrZeroAddress } from '../../helpers/misc-utils';
import { LeveragerFactory, MintableDelegationERC20Factory, VariableVdTokenFactory } from '../../types';
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

      console.log('leverager :>> ', leverager);

      /************ Single Loop *************/

      // const ERC20Addr = '0xd8134205b0328f5676aaefb3b2a0dc15f4029d8c';
      // // const ERC20Contract = await MintableDelegationERC20Factory.connect(ERC20Addr, await getFirstSigner());
      // // await ERC20Contract.approve(leverager, ethers.constants.MaxInt256);

      // // console.log('approved');

      // const leveragerContract = await LeveragerFactory.connect(leverager, await getFirstSigner());

      // // const debtToken = await leveragerContract.getVDebtToken(ERC20Addr);
      // // console.log('debtToken :>> ', debtToken);
      // // const debtTokenContract = await VariableVdTokenFactory.connect(debtToken, await getFirstSigner());

      // // let tx = await debtTokenContract.approveDelegation(leveragerContract.address, ethers.constants.MaxInt256);
      // // await tx.wait();
      // console.log('approveDelegate');

      // let tx = await leveragerContract.singleLoop(ERC20Addr, ethers.utils.parseUnits('50', 18), 2, 5000, 1);
      // await tx.wait();
      // console.log('loop');

      /************ Vault Loop *************/

      const underlyingAsset = '0x11fE4B6AE13d2a6055C8D9cF65c55bac32B5d844';
      const vaultAsset = '0xd8134205b0328f5676aaefb3b2a0dc15f4029d8c';
      const vaultContract = await MintableDelegationERC20Factory.connect(vaultAsset, await getFirstSigner());
      await vaultContract.approve(leverager, ethers.constants.MaxInt256);
      // const underlyingContract = await MintableDelegationERC20Factory.connect(underlyingAsset, await getFirstSigner());
      // await underlyingContract.approve(vaultAsset, ethers.constants.MaxInt256);

      console.log('approved');

      const leveragerContract = await LeveragerFactory.connect(leverager, await getFirstSigner());

      // let debtToken = await leveragerContract.getVDebtToken(underlyingAsset);
      // console.log('debtToken :>> ', debtToken);
      // let debtTokenContract = await VariableVdTokenFactory.connect(debtToken, await getFirstSigner());

      // let tx = await debtTokenContract.approveDelegation(leveragerContract.address, ethers.constants.MaxInt256);
      // await tx.wait();
      // console.log('approveDelegate');

      // debtToken = await leveragerContract.getVDebtToken(vaultAsset);
      // console.log('debtToken :>> ', debtToken);
      // debtTokenContract = await VariableVdTokenFactory.connect(debtToken, await getFirstSigner());

      // tx = await debtTokenContract.approveDelegation(leveragerContract.address, ethers.constants.MaxInt256);
      // await tx.wait();
      // console.log('approveDelegate');

      let tx = await leveragerContract.vaultLoop(underlyingAsset, vaultAsset, ethers.utils.parseUnits('50', 18), 2, 5000, 2);
      await tx.wait();
      console.log('loop');
    } catch (err) {
      console.error(err);
      exit(1);
    }
  });
