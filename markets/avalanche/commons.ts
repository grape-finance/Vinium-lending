import BigNumber from 'bignumber.js';
import {
  oneEther,
  oneRay,
  RAY,
  ZERO_ADDRESS,
  MOCK_CHAINLINK_AGGREGATORS_PRICES,
  oneUsd,
} from '../../helpers/constants';
import { ICommonConfiguration, eAvalancheNetwork, eBaseNetwork, eEthereumNetwork } from '../../helpers/types';
import {
  strategySAVAX,
  strategyUSDC,
  strategyUSDT,
  strategyDAI,
  strategyWETH,
  strategyBTCB,
  strategyGRAPE, strategyWAVAX, strategyWBTC,
} from './reservesConfigs';

// ----------------
// PROTOCOL GLOBAL PARAMS
// ----------------

export const CommonsConfig: ICommonConfiguration = {
  MarketId: 'Commons',
  ViTokenNamePrefix: 'Vinium Goerli Market',
  StableVdTokenNamePrefix: 'Vinium Goerli Market stable debt',
  VariableVdTokenNamePrefix: 'Vinium Goerli Market variable debt',
  SymbolPrefix: 'v',
  ProviderId: 1, // Overriden in index.ts
  OracleQuoteCurrency: 'USD',
  OracleQuoteUnit: oneUsd.toString(),
  ProtocolGlobalParams: {
    TokenDistributorPercentageBase: '10000',
    MockUsdPriceInWei: '5848466240000000',
    UsdAddress: '0x10F7Fc1F91Ba351f9C629c5947AD69bD03C05b96', // TODO: what is this?
    NilAddress: '0x0000000000000000000000000000000000000000',
    OneAddress: '0x0000000000000000000000000000000000000001',
    ViniumReferral: '0',
  },

  // ----------------
  // COMMON PROTOCOL PARAMS ACROSS POOLS AND NETWORKS
  // ----------------

  Mocks: {
    AllAssetsInitialPrices: {
      ...MOCK_CHAINLINK_AGGREGATORS_PRICES,
    },
  },
  // TODO: reorg alphabetically, checking the reason of tests failing
  LendingRateOracleRatesCommon: {
    WETH: {
      borrowRate: oneRay.multipliedBy(0.03).toFixed(),
    },
    DAI: {
      borrowRate: oneRay.multipliedBy(0.039).toFixed(),
    },
    USDC: {
      borrowRate: oneRay.multipliedBy(0.039).toFixed(),
    },
    USDT: {
      borrowRate: oneRay.multipliedBy(0.035).toFixed(),
    },
    VINIUM: {
      borrowRate: oneRay.multipliedBy(0.03).toFixed(),
    },
    WBTC: {
      borrowRate: oneRay.multipliedBy(0.03).toFixed(),
    },
    WAVAX: {
      borrowRate: oneRay.multipliedBy(0.05).toFixed(), // TODO: fix borrowRate?
    },
  },
  // ----------------
  // COMMON PROTOCOL ADDRESSES ACROSS POOLS
  // ----------------


  // ViToken:{
  //   [eAvalancheNetwork.avalanche]: undefined,
  //   [eAvalancheNetwork.fuji]: undefined,
  //   [eEthereumNetwork.goerli]: '0xE1E1fF2B2e6Df48Fe71D2a5E526316dE27aC2773',
  // },

  // If PoolAdmin/emergencyAdmin is set, will take priority over PoolAdminIndex/emergencyAdminIndex
  PoolAdmin: {
    [eAvalancheNetwork.avalanche]: undefined,
    [eAvalancheNetwork.fuji]: undefined,
    [eEthereumNetwork.goerli]: '0x4Aa6Da4ca5d76e8d5e3ACD11B92Ab22D564F1fcb',
  },
  PoolAdminIndex: 0,
  EmergencyAdminIndex: 0,
  EmergencyAdmin: {
    [eAvalancheNetwork.avalanche]: undefined,
    [eAvalancheNetwork.fuji]: undefined,
    [eEthereumNetwork.goerli]: '0x4Aa6Da4ca5d76e8d5e3ACD11B92Ab22D564F1fcb',
  },
  ProviderRegistry: {
    [eAvalancheNetwork.avalanche]: '',
    [eAvalancheNetwork.fuji]: '',
    [eEthereumNetwork.goerli]: '',
  },
  ProviderRegistryOwner: {
    [eAvalancheNetwork.avalanche]: '',
    [eAvalancheNetwork.fuji]: '',
    [eEthereumNetwork.goerli]: '0x4Aa6Da4ca5d76e8d5e3ACD11B92Ab22D564F1fcb',
  },
  LendingRateOracle: {
    [eAvalancheNetwork.avalanche]: '0xCA3eb6E8c67a2B00C5B35E0Fd469d50712017279',
    [eAvalancheNetwork.fuji]: '',
  },
  LendingPoolCollateralManager: {
    [eAvalancheNetwork.avalanche]: '',
    [eAvalancheNetwork.fuji]: '',
    [eEthereumNetwork.goerli]: '0x10b289593f9DCB64fE8B5EbaCE7538C8f6E0cc74',    
  },
  LendingPoolConfigurator: {
    [eAvalancheNetwork.avalanche]: '',
    [eAvalancheNetwork.fuji]: '',
    [eEthereumNetwork.goerli]: '0xd6bFaDbe46868bae673E5C08227686d79361307E',        
  },
  LendingPool: {
    [eAvalancheNetwork.avalanche]: '',
    [eAvalancheNetwork.fuji]: '',
    [eEthereumNetwork.goerli]: '0x8Ce59fa0b750c5eCe33d831Cf9e449359B85f2a2',    
  },
  WethGateway: {
    [eAvalancheNetwork.avalanche]: '',
    [eAvalancheNetwork.fuji]: '',
    [eEthereumNetwork.goerli]: '0x5A334bC82A5e2Fc0711697FF4B1F99CBEaa508C8',
  },
  TokenDistributor: {
    [eAvalancheNetwork.avalanche]: '',
    [eAvalancheNetwork.fuji]: '',
  },
  ViniumOracle: {
    [eAvalancheNetwork.avalanche]: '0xFC5C922b6A0137FD33E3604663aB468D15C9d4f5',
    [eAvalancheNetwork.fuji]: '',
    [eEthereumNetwork.goerli]: '0x114b024AA7EE7273F45290057375572e9F09d5B3',
    
  },
  FallbackOracle: {
    [eAvalancheNetwork.avalanche]: ZERO_ADDRESS,
    [eAvalancheNetwork.fuji]: ZERO_ADDRESS,
    [eEthereumNetwork.goerli]: ZERO_ADDRESS,
  },
  ChainlinkAggregator: {
    [eAvalancheNetwork.avalanche]: {
      SAVAX: '0x49bDF0321C4Bf17c9297a6B266F55F3AF3cb0aDE',
      USDC: '0xF096872672F44d6EBA71458D74fe67F9a77a23B9',
      USDT: '0xEBE676ee90Fe1112671f19b6B7459bC678B67e8a',
      DAI: '0x51D7180edA2260cc4F6e4EebB82FEF5c3c2B8300',
      WETH: '0x976B3D034E162d8bD72D6b9C989d545b839003b0',
      BTCB: '0x2779D32d5166BAaa2B2b658333bA7e6Ec0C65743',
      GRAPE: '0xad42d3f890fe384f888d3d1c849ed12e9b8372c8',
      // VINIUM: '0x3CA13391E9fb38a75330fb28f8cc2eB3D9ceceED',
      // WBTC: '0x2779D32d5166BAaa2B2b658333bA7e6Ec0C65743',
      WAVAX: '0x0A77230d17318075983913bC2145DB16C7366156',
    },
    [eAvalancheNetwork.fuji]: {
      WETH: '0x86d67c3D38D2bCeE722E601025C25a575021c6EA',
      USDT: '0x7898AcCC83587C3C55116c5230C17a6Cd9C71bad',
      WBTC: '0x31CF013A08c6Ac228C94551d535d5BAfE19c602a',
      WAVAX: '0x5498BB86BC934c8D34FDA08E81D444153d0D06aD',
      USD: '0x86d67c3D38D2bCeE722E601025C25a575021c6EA',
    },
    [eEthereumNetwork.goerli]: {
      WETH: '0xD4a33860578De61DBAbDc8BFdb98FD742fA7028e', 
      WBTC: "0xA39434A63A52E749F02807ae27335515BA4b07F7", 
      DAI: "0x0d79df66BE487753B02D015Fb622DED7f0E9798d", 
      USDT: '0xAb5c49580294Aff77670F839ea425f5b78ab3Ae7', 
    },
  },
  ReserveAssets: {
    [eAvalancheNetwork.avalanche]: {},
    [eAvalancheNetwork.fuji]: {},
    [eEthereumNetwork.goerli]: {
      WETH: '0xb4fbf271143f4fbf7b91a5ded31805e42b2208d6', // Official WETH
      WBTC: "0xbf781b25A4632C580A210b3A9D06F95a720d5672", // MintableERC20 token
      DAI: "0x5810ecE5108924a8d793Dce0620fbF60C596aF77", // MintableERC20 token
      USDT: '0x0B3924aBe2A9856e9b685c7788d15fFD465C3Dd4', // MintableERC20 token
    },
    
  },
  ReservesConfig: {
    WETH: strategyWETH,
    WBTC: strategyWBTC,
    DAI: strategyDAI,
    USDT: strategyUSDT
  },
  ViToken:{
    [eAvalancheNetwork.avalanche]: '',
    [eAvalancheNetwork.fuji]: '',
    [eEthereumNetwork.goerli]: '',
  },
  ViTokenDomainSeparator: {
    [eAvalancheNetwork.avalanche]: '',
    [eAvalancheNetwork.fuji]: '',
  },
  WETH: {
    [eAvalancheNetwork.avalanche]: '',
    [eAvalancheNetwork.fuji]: '',
    [eEthereumNetwork.goerli]: '0xb4fbf271143f4fbf7b91a5ded31805e42b2208d6',
    
  },
  WrappedNativeToken: {
    [eAvalancheNetwork.avalanche]: '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7', // Official WAVAX
    [eAvalancheNetwork.fuji]: '0xd00ae08403B9bbb9124bB305C09058E32C39A48c', // Official WAVAX
    [eEthereumNetwork.goerli]: '0xb4fbf271143f4fbf7b91a5ded31805e42b2208d6', // Official WAVAX
  },
  ReserveFactorTreasuryAddress: {
    [eAvalancheNetwork.avalanche]: '0xEB755b81A786832705a3c0658127216eD36fE898',
    [eAvalancheNetwork.fuji]: '0xB45F5C501A22288dfdb897e5f73E189597e09288', // Self-controlled EOA for testing
    [eEthereumNetwork.goerli]: '0x4Aa6Da4ca5d76e8d5e3ACD11B92Ab22D564F1fcb',
  },
  OFTTokenAddress: {
    [eAvalancheNetwork.avalanche]: '',
    [eAvalancheNetwork.fuji]: '',
    [eEthereumNetwork.goerli]: '0xc91659a1c17De3aAb2E1a70cb93116CDB6cc0fb5',
    [eBaseNetwork.base]: '',
  },
  OFTEndpoint: {
    [eAvalancheNetwork.avalanche]: '',
    [eAvalancheNetwork.fuji]: '',
    [eEthereumNetwork.goerli]: '0xbfD2135BFfbb0B5378b56643c2Df8a87552Bfa23',
    [eBaseNetwork.base]: '0xb6319cC6c8c27A8F5dAF0dD3DF91EA35C4720dd7',
  },
  OFTTreasury: {
    [eAvalancheNetwork.avalanche]: '',
    [eAvalancheNetwork.fuji]: '',
    [eEthereumNetwork.goerli]: '0x4Aa6Da4ca5d76e8d5e3ACD11B92Ab22D564F1fcb',
    [eBaseNetwork.base]: '0x4Aa6Da4ca5d76e8d5e3ACD11B92Ab22D564F1fcb',
  },
  LiquidityZap: {
    [eAvalancheNetwork.avalanche]: '',
    [eAvalancheNetwork.fuji]: '',
    [eEthereumNetwork.goerli]: '0xE614d3F8d4204B0C1585d07C783F90ea2B6b8aB4',
    [eBaseNetwork.base]: '',
  },
  UniswapPoolHelper: {
    [eAvalancheNetwork.avalanche]: '',
    [eAvalancheNetwork.fuji]: '',
    [eEthereumNetwork.goerli]: '0x3AAba231d16f9949f9F3e2776eDe23c102Ca0995',
    [eBaseNetwork.base]: '',
  },
  LockZap: {
    [eAvalancheNetwork.avalanche]: '',
    [eAvalancheNetwork.fuji]: '',
    [eEthereumNetwork.goerli]: '0xc628156900E97B9CDC21C61Eb88e1DAc8C1dE8d0',
    [eBaseNetwork.base]: '',
  },
  BaseOracle: {
    [eAvalancheNetwork.avalanche]: '',
    [eAvalancheNetwork.fuji]: '',
    [eEthereumNetwork.goerli]: '',
    [eBaseNetwork.base]: '',
  },
  UniV2TwapOracle: {
    [eAvalancheNetwork.avalanche]: '',
    [eAvalancheNetwork.fuji]: '',
    [eEthereumNetwork.goerli]: '0x044DfA8DB54e2FDFdfEECAE61343DC3194467207',
    [eBaseNetwork.base]: '',
  },
  PriceProvider: {
    [eAvalancheNetwork.avalanche]: '',
    [eAvalancheNetwork.fuji]: '',
    [eEthereumNetwork.goerli]: '0xd48c963821D4Fa49c99f1C7748563AC75185211B',
    [eBaseNetwork.base]: '',
  },
  LockerList: {
    [eAvalancheNetwork.avalanche]: '',
    [eAvalancheNetwork.fuji]: '',
    [eEthereumNetwork.goerli]: '0xa6Bd4606667B0C2414Db4f65e8c8C11D517b579C',
    [eBaseNetwork.base]: '',
  },
  MultiFeeDistribution: {
    [eAvalancheNetwork.avalanche]: '',
    [eAvalancheNetwork.fuji]: '',
    [eEthereumNetwork.goerli]: '0xC7166497936d2542E39e874EC4f0C583e644F009',
    [eBaseNetwork.base]: '',
  },
  MiddleFeeDistribution: {
    [eAvalancheNetwork.avalanche]: '',
    [eAvalancheNetwork.fuji]: '',
    [eEthereumNetwork.goerli]: '0xD996976110075cfa000224E593811e51A1F43C9A',
    [eBaseNetwork.base]: '',
  },
  EligibilityDataProvider: {
    [eAvalancheNetwork.avalanche]: '',
    [eAvalancheNetwork.fuji]: '',
    [eEthereumNetwork.goerli]: '0x0523b1836caba731071A660201325bE4D20b0256',
    [eBaseNetwork.base]: '',
  },
  IncentivesController: {
    [eAvalancheNetwork.avalanche]: '0x4a40Cf33cc1D38fc1C4668F398eE17133f5c2636',
    [eAvalancheNetwork.fuji]: '0xa1EF206fb9a8D8186157FC817fCddcC47727ED55',
    [eEthereumNetwork.goerli]: '0xA8c523263E3aEDC6df5a731E6e588049cE01322F',
  },
};
