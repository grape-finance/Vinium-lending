import { task } from 'hardhat/config';
import { deployTwapPriceOracleFeed } from '../../../helpers/contracts-deployments';
import { exit } from 'process';
import { getFirstSigner } from '../../../helpers/contracts-getters';
import { TwapOraclePriceFeedFactory } from '../../../types';
import { formatEther, parseEther } from 'ethers/lib/utils';

task('full:twap-oracle', 'Initialize lending pool configuration.')
  .addFlag('verify', 'Verify contracts at Etherscan')
  .setAction(async ({ verify }, localBRE) => {
    try {
      await localBRE.run('set-DRE');

      const UNISWAP_FACTORY = '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f';
      const WETHAddr = '0xb4fbf271143f4fbf7b91a5ded31805e42b2208d6';
      const ViniumAddr = '0x2f058f16223d0c74a1a2e6a9a47ba9c78f8776b8';

      const twapPriceOracleFeed = await deployTwapPriceOracleFeed([UNISWAP_FACTORY, WETHAddr, ViniumAddr], verify);
      console.log('twapPriceOracleFeed.address :>> ', twapPriceOracleFeed.address);

      const twapOracleFeedContract = await TwapOraclePriceFeedFactory.connect(twapPriceOracleFeed.address, await getFirstSigner());
      const twapPrice = await twapOracleFeedContract.consult(ViniumAddr, parseEther('1000'));
      console.log('twapPrice :>> ', +formatEther(twapPrice));
    } catch (err) {
      console.error(err);
      exit(1);
    }
  });
