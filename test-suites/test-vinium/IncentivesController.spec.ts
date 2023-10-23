import { expect } from 'chai';
import hre, { network, ethers, waffle } from 'hardhat';
// const { waffle, ethers } = hre;
const { provider, deployContract } = waffle;

import type { Signer, Contract } from 'ethers';
import { parseEther, parseUnits } from 'ethers/lib/utils';
import { BigNumber } from 'bignumber.js';

import {
  ChefIncentivesControllerFactory,
  ChefIncentivesController,
  MultiFeeDistribution,
  MintableERC20,
  MintableERC20Factory,
  ViniumOFTFactory,
  ViniumOFT,
  MultiFeeDistributionFactory,
  LendingPoolFactory,
  LendingPool,
  LendingPoolAddressesProvider,
  LendingPoolAddressesProviderFactory,
  ReserveLogic,
  ReserveLogicFactory,
  GenericLogic,
  GenericLogicFactory,
  ValidationLogic,
  ValidationLogicFactory,
} from '../../types';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { sign } from 'crypto';

describe('Reward', function () {
  let owner: SignerWithAddress;
  let alice: SignerWithAddress;
  let bob: SignerWithAddress;

  let lendingPoolAddressesProvider: LendingPoolAddressesProvider;
  let lendingPoolContract: LendingPool;
  let reserveLogic: ReserveLogic;
  let genericLogic: GenericLogic;
  let validationLogic: ValidationLogic;
  let chefIncentivesContract: ChefIncentivesController;
  let multiFeeDistributionContract: MultiFeeDistribution;
  let ViniumOFTContract: ViniumOFT;

  before(async () => {
    // await hre.network.provider.request({
    //   method: 'hardhat_reset',
    //   params: [
    //     {
    //       forking: {
    //         // @ts-ignore
    //         jsonRpcUrl: hre.config.networks.hardhat.forking?.url,
    //         blockNumber: 9872456,
    //       },
    //     },
    //   ],
    // });

    const signers = await ethers.getSigners();
    owner = signers[0];
    alice = signers[1];
    bob = signers[2];

    lendingPoolAddressesProvider = await new LendingPoolAddressesProviderFactory(owner).deploy('Commons');
    await lendingPoolAddressesProvider.setPoolAdmin(owner.address);
    await lendingPoolAddressesProvider.setEmergencyAdmin(owner.address);

    console.log('lendingPoolAddressesProvider.address :>> ', lendingPoolAddressesProvider.address);

    reserveLogic = await new ReserveLogicFactory(owner).deploy();
    genericLogic = await new GenericLogicFactory(owner).deploy();

    interface ValidationLogicLibraryAddresses {
      ['__$52a8a86ab43135662ff256bbc95497e8e3$__']: string;
    }
    const linkLibraryAddr: ValidationLogicLibraryAddresses = { ['__$52a8a86ab43135662ff256bbc95497e8e3$__']: reserveLogic.address };
    validationLogic = await new ValidationLogicFactory(linkLibraryAddr, owner).deploy();

    const libraries = {
      ['__$de8c0cf1a7d7c36c802af9a64fb9d86036$__']: validationLogic.address,
      ['__$22cd43a9dda9ce44e9b92ba393b88fb9ac$__']: reserveLogic.address,
    };

    const lendingPoolImpl = await new LendingPoolFactory(libraries, owner).deploy();
    await lendingPoolImpl.initialize(lendingPoolAddressesProvider.address);

    await lendingPoolAddressesProvider.setLendingPoolImpl(lendingPoolImpl.address);

    const lendingPoolAddr = await lendingPoolAddressesProvider.getLendingPool();

    lendingPoolContract = LendingPoolFactory.connect(lendingPoolAddr, owner);
  });

  it('Should have contracts deployed.', async function () {
    console.log('hre.config.networks.hardhat.forking?.url :>> ', hre.config.networks.hardhat.forking?.url);
    expect(!!lendingPoolContract.address).to.be.true;
    expect(!!chefIncentivesContract.address).to.be.true;
    expect(!!multiFeeDistributionContract.address).to.be.true;
  });

  describe('Main', function () {
    it('Deposit collateral', async () => {
      try {
        const reservesList = await lendingPoolContract.getReservesList();
        console.log('reservesList :>> ', reservesList);
        const DaiContract = MintableERC20Factory.connect(reservesList[2], owner);

        await DaiContract.approve(lendingPoolContract.address, ethers.utils.parseEther('1'));

        await lendingPoolContract.connect(owner).deposit(reservesList[2], ethers.utils.parseEther('1'), owner.address, 0);
      } catch (err) {
        console.log('asdf :>> ', err);
      }

      // await lendingPoolContract.connect(signer).borrow(reservesList[1], ethers.utils.parseEther('0.001'), 2, 0, signer.address);
    });
    it('Claim Vinium', async () => {
      const reservesList = await lendingPoolContract.getReservesList();
      let reserveData = await lendingPoolContract.getReserveData(reservesList[2]);

      let beforeBal = await ViniumOFTContract.balanceOf(owner.address);
      console.log('beforeBal :>> ', beforeBal);

      await chefIncentivesContract.claim(owner.address, [reserveData.viTokenAddress]);

      let afterBal = await ViniumOFTContract.balanceOf(owner.address);
      console.log('afterBal :>> ', afterBal);

      // reserveData = await lendingPoolContract.getReserveData(reservesList[1]);

      // beforeBal = await ViniumOFTContract.balanceOf(signer.address);
      // console.log('beforeBal :>> ', beforeBal);

      // await chefIncentivesContract.claim(signer.address, [reserveData.viTokenAddress]);

      // afterBal = await ViniumOFTContract.balanceOf(signer.address);
      // console.log('afterBal :>> ', afterBal);

      // reserveData = await lendingPoolContract.getReserveData(reservesList[0]);

      // beforeBal = await ViniumOFTContract.balanceOf(signer.address);
      // console.log('beforeBal :>> ', beforeBal);

      // await chefIncentivesContract.claim(signer.address, [reserveData.viTokenAddress]);

      // afterBal = await ViniumOFTContract.balanceOf(signer.address);
      // console.log('afterBal :>> ', afterBal);
    });
    it('Stake Vinium', async () => {
      const reservesList = await lendingPoolContract.getReservesList();
      let reserveData = await lendingPoolContract.getReserveData(reservesList[2]);

      let beforeBal = await ViniumOFTContract.balanceOf(owner.address);
      console.log('beforeBal :>> ', beforeBal);

      await chefIncentivesContract.claim(owner.address, [reserveData.viTokenAddress]);

      let afterBal = await ViniumOFTContract.balanceOf(owner.address);
      console.log('afterBal :>> ', afterBal);

      // reserveData = await lendingPoolContract.getReserveData(reservesList[1]);

      // beforeBal = await ViniumOFTContract.balanceOf(signer.address);
      // console.log('beforeBal :>> ', beforeBal);

      // await chefIncentivesContract.claim(signer.address, [reserveData.viTokenAddress]);

      // afterBal = await ViniumOFTContract.balanceOf(signer.address);
      // console.log('afterBal :>> ', afterBal);

      // reserveData = await lendingPoolContract.getReserveData(reservesList[0]);

      // beforeBal = await ViniumOFTContract.balanceOf(signer.address);
      // console.log('beforeBal :>> ', beforeBal);

      // await chefIncentivesContract.claim(signer.address, [reserveData.viTokenAddress]);

      // afterBal = await ViniumOFTContract.balanceOf(signer.address);
      // console.log('afterBal :>> ', afterBal);
    });
  });
});
