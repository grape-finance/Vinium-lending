import { task } from 'hardhat/config';
import { deployLeverager, deployViniumProtocolDataProvider } from '../../helpers/contracts-deployments';
import { exit } from 'process';
import { getFirstSigner, getLendingPoolAddressesProvider } from '../../helpers/contracts-getters';
import { ConfigNames, loadPoolConfig } from '../../helpers/configuration';
import { ICommonConfiguration, eNetwork } from '../../helpers/types';
import { getParamPerNetwork } from '../../helpers/contracts-helpers';
import { notFalsyOrZeroAddress } from '../../helpers/misc-utils';
import { LeveragerFactory, MintableDelegationERC20Factory, VariableVdTokenFactory, WETH9Factory } from '../../types';
import { ethers } from 'ethers';

task('full:deploy-leverager', 'Initialize lending pool configuration.')
  .addFlag('verify', 'Verify contracts at Etherscan')
  .addParam('pool', `Pool name to retrieve configuration, supported: ${Object.values(ConfigNames)}`)
  .setAction(async ({ verify, pool }, localBRE) => {
    try {
      const sleep = (delay: number) => new Promise((resolve) => setTimeout(resolve, delay * 1000));

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

      // let tx = await leveragerContract.singleTokenLoop(ERC20Addr, ethers.utils.parseUnits('50', 18), 2, 5000, 1);
      // await tx.wait();
      // console.log('loop');

      /************ Vault Loop *************/

      // const underlyingAsset = '0x11fE4B6AE13d2a6055C8D9cF65c55bac32B5d844';
      // const vaultAsset = '0xd8134205b0328f5676aaefb3b2a0dc15f4029d8c';
      // const vaultContract = await MintableDelegationERC20Factory.connect(vaultAsset, await getFirstSigner());
      // await vaultContract.approve(leverager, ethers.constants.MaxInt256);

      // console.log('approved');

      // const leveragerContract = await LeveragerFactory.connect(leverager, await getFirstSigner());

      // let debtToken = await leveragerContract.getVDebtToken(underlyingAsset);
      // console.log('debtToken :>> ', debtToken);
      // let debtTokenContract = await VariableVdTokenFactory.connect(debtToken, await getFirstSigner());

      // let tx = await debtTokenContract.approveDelegation(leveragerContract.address, ethers.constants.MaxInt256);
      // await tx.wait();
      // console.log('approveDelegate');

      // tx = await leveragerContract.vaultTokenLoop(underlyingAsset, vaultAsset, ethers.utils.parseUnits('50', 18), 2, 5000, 2);
      // await tx.wait();
      // console.log('loop');

      /************ Lido Loop *************/

      const WETH = '0xb4fbf271143f4fbf7b91a5ded31805e42b2208d6';
      const swETH = '0x8bb383A752Ff3c1d510625C6F536E3332327068F';

      const WETHContract = await WETH9Factory.connect(WETH, await getFirstSigner());
      await (await WETHContract.approve(leverager, ethers.constants.MaxInt256)).wait();

      const swETHContract = await MintableDelegationERC20Factory.connect(swETH, await getFirstSigner());
      await (await swETHContract.approve(leverager, ethers.constants.MaxInt256)).wait();

      console.log('approved');

      const leveragerContract = await LeveragerFactory.connect(leverager, await getFirstSigner());

      let debtToken = await leveragerContract.getVDebtToken(WETH);
      console.log('debtToken :>> ', debtToken);
      let debtTokenContract = await VariableVdTokenFactory.connect(debtToken, await getFirstSigner());

      await (await debtTokenContract.approveDelegation(leveragerContract.address, ethers.constants.MaxInt256)).wait();

      console.log('approveDelegate');

      await sleep(3);
      await (await leveragerContract.liquidStakingTokenLoop(WETH, swETH, ethers.utils.parseUnits('0.001', 18), 2, 5000, 1)).wait();
      console.log('loop');
      // await (await leveragerContract.liquidStakingTokenLoop1(WETH, swETH, ethers.utils.parseUnits('0.001', 18), 2, 5000, 1)).wait();
      // console.log('loop1');
      // await (await leveragerContract.liquidStakingTokenLoop11(WETH, swETH, ethers.utils.parseUnits('0.001', 18), 2, 0000, 1)).wait();
      // console.log('loop11');
      // await (await leveragerContract.liquidStakingTokenLoop2(WETH, swETH, ethers.utils.parseUnits('0.001', 18), 2, 5000, 1)).wait();
      // console.log('loop2');
    } catch (err) {
      console.error(err);
      exit(1);
    }
  });
