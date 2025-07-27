# Technical Specification: 1inch Options Protocol

## Architecture Overview

### Core Components

#### 1. OptionsHook Smart Contract
The main contract extending 1inch Limit Order Protocol with options functionality.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@1inch/limit-order-protocol/contracts/interfaces/IOrderMixin.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

contract OptionsHook {
    struct OptionOrder {
        address underlying;      // Underlying asset address
        address collateral;      // Collateral token address  
        uint256 strike;          // Strike price in collateral terms
        uint256 expiry;          // Expiration timestamp
        uint256 premium;         // Option premium
        bool isCall;             // True for call, false for put
        bool isEuropean;         // True for European, false for American
        address oracle;          // Price oracle address
    }
    
    mapping(bytes32 => OptionOrder) public options;
    mapping(bytes32 => uint256) public collateralLocked;
    mapping(address => uint256) public userCollateral;
    
    event OptionCreated(bytes32 indexed orderHash, OptionOrder option);
    event OptionExercised(bytes32 indexed orderHash, uint256 exercisePrice);
    event OptionExpired(bytes32 indexed orderHash);
    
    function createOption(OptionOrder calldata option) external returns (bytes32);
    function exerciseOption(bytes32 orderHash) external;
    function settleExpiredOption(bytes32 orderHash) external;
}
```

#### 2. Price Oracle Integration
Chainlink integration for reliable price feeds.

```solidity
contract OptionsPriceOracle {
    mapping(address => AggregatorV3Interface) public priceFeeds;
    
    function getPrice(address asset) external view returns (uint256) {
        AggregatorV3Interface priceFeed = priceFeeds[asset];
        require(address(priceFeed) != address(0), "Price feed not found");
        
        (, int256 price, , , ) = priceFeed.latestRoundData();
        require(price > 0, "Invalid price");
        
        return uint256(price);
    }
}
```

#### 3. Collateral Manager
Handles locking and releasing of collateral for options.

```solidity
contract CollateralManager {
    using SafeERC20 for IERC20;
    
    struct CollateralPosition {
        uint256 locked;
        uint256 available;
        address token;
    }
    
    mapping(address => mapping(address => CollateralPosition)) public positions;
    
    function lockCollateral(
        address user,
        address token,
        uint256 amount
    ) external {
        positions[user][token].locked += amount;
        IERC20(token).safeTransferFrom(user, address(this), amount);
    }
    
    function releaseCollateral(
        address user,
        address token,
        uint256 amount
    ) external {
        require(positions[user][token].locked >= amount, "Insufficient locked");
        positions[user][token].locked -= amount;
        IERC20(token).safeTransfer(user, amount);
    }
}
```

## Integration with 1inch Limit Order Protocol

### Custom Predicates

#### Time Predicate
Validates option expiry against current block timestamp.

```solidity
contract TimePredicate {
    function checkTime(uint256 expiry) external view returns (bool) {
        return block.timestamp <= expiry;
    }
}
```

#### Price Predicate  
Checks if current price meets exercise conditions.

```solidity
contract PricePredicate {
    function checkStrike(
        address oracle,
        address asset,
        uint256 strike,
        bool isCall
    ) external view returns (bool) {
        uint256 currentPrice = OptionsPriceOracle(oracle).getPrice(asset);
        
        if (isCall) {
            return currentPrice >= strike;
        } else {
            return currentPrice <= strike;
        }
    }
}
```

### Order Structure Enhancement

```solidity
struct LimitOrder {
    uint256 salt;
    address makerAsset;
    address takerAsset;
    address maker;
    address receiver;
    address allowedSender;
    uint256 makingAmount;
    uint256 takingAmount;
    uint256 offsets;
    bytes interactions; // Contains options-specific data
}
```

## Implementation Phases

### Phase 1: Basic Infrastructure

#### Smart Contracts
1. **OptionsHook.sol** - Main options logic
2. **OptionsPriceOracle.sol** - Price feed integration
3. **CollateralManager.sol** - Asset management
4. **Predicates/** - Custom validation logic

#### Key Functions

##### Option Creation
```solidity
function createCoveredCall(
    address underlying,
    uint256 amount,
    uint256 strike,
    uint256 expiry,
    uint256 premium
) external returns (bytes32) {
    // Lock underlying as collateral
    collateralManager.lockCollateral(msg.sender, underlying, amount);
    
    // Create option order
    OptionOrder memory option = OptionOrder({
        underlying: underlying,
        collateral: underlying,
        strike: strike,
        expiry: expiry,
        premium: premium,
        isCall: true,
        isEuropean: false,
        oracle: priceOracles[underlying]
    });
    
    bytes32 orderHash = keccak256(abi.encode(option, block.timestamp));
    options[orderHash] = option;
    
    emit OptionCreated(orderHash, option);
    return orderHash;
}
```

##### Option Exercise
```solidity
function exerciseOption(bytes32 orderHash) external {
    OptionOrder storage option = options[orderHash];
    require(option.expiry > block.timestamp, "Option expired");
    
    uint256 currentPrice = oracle.getPrice(option.underlying);
    
    if (option.isCall) {
        require(currentPrice >= option.strike, "Out of the money");
        // Transfer underlying to exerciser
        // Collect strike price from exerciser
    } else {
        require(currentPrice <= option.strike, "Out of the money");
        // Transfer strike price to exerciser  
        // Collect underlying from exerciser
    }
    
    emit OptionExercised(orderHash, currentPrice);
}
```

### Phase 2: Advanced Features

#### American Options
```solidity
modifier canExercise(bytes32 orderHash) {
    OptionOrder storage option = options[orderHash];
    require(option.expiry > block.timestamp, "Expired");
    require(!option.isEuropean, "European option");
    _;
}

function exerciseAmerican(bytes32 orderHash) external canExercise(orderHash) {
    // Early exercise logic
}
```

#### Automatic Settlement
```solidity
function settleExpiredOptions(bytes32[] calldata orderHashes) external {
    for (uint i = 0; i < orderHashes.length; i++) {
        OptionOrder storage option = options[orderHashes[i]];
        
        if (option.expiry <= block.timestamp) {
            uint256 settlementPrice = oracle.getPrice(option.underlying);
            _settle(orderHashes[i], settlementPrice);
        }
    }
}
```

### Phase 3: UI Integration

#### React Components
```typescript
// OptionsTrading.tsx
interface OptionOrder {
  underlying: string;
  strike: number;
  expiry: Date;
  premium: number;
  isCall: boolean;
}

const OptionsTrading: React.FC = () => {
  const [orders, setOrders] = useState<OptionOrder[]>([]);
  
  const createOption = async (option: OptionOrder) => {
    const contract = new ethers.Contract(
      OPTIONS_HOOK_ADDRESS,
      OptionsHookABI,
      signer
    );
    
    const tx = await contract.createOption(option);
    await tx.wait();
  };
  
  return (
    <div>
      <OptionOrderForm onSubmit={createOption} />
      <OptionOrderBook orders={orders} />
    </div>
  );
};
```

#### Web3 Integration
```typescript
// hooks/useOptions.ts
export const useOptions = () => {
  const { provider, signer } = useWeb3();
  
  const createCoveredCall = useCallback(async (
    underlying: string,
    amount: BigNumber,
    strike: BigNumber,
    expiry: number,
    premium: BigNumber
  ) => {
    const contract = new Contract(
      OPTIONS_HOOK_ADDRESS,
      OptionsHookABI,
      signer
    );
    
    return await contract.createCoveredCall(
      underlying,
      amount,
      strike,
      expiry,
      premium
    );
  }, [signer]);
  
  return { createCoveredCall };
};
```

## Gas Optimization Strategies

### Batch Operations
```solidity
function batchSettlement(bytes32[] calldata orderHashes) external {
    uint256 gasStart = gasleft();
    
    for (uint i = 0; i < orderHashes.length; i++) {
        _settleOption(orderHashes[i]);
    }
    
    // Gas rebate mechanism
    uint256 gasUsed = gasStart - gasleft();
    _refundGas(msg.sender, gasUsed);
}
```

### Efficient Storage
```solidity
// Pack option data into single storage slot
struct PackedOption {
    uint64 strike;      // 8 bytes
    uint32 expiry;      // 4 bytes  
    uint16 premium;     // 2 bytes
    bool isCall;        // 1 bit
    bool isEuropean;    // 1 bit
    // Total: 14.25 bytes (fits in 32-byte slot)
}
```

## Security Considerations

### Access Controls
```solidity
modifier onlyAuthorized() {
    require(
        msg.sender == owner() || 
        msg.sender == limitOrderProtocol,
        "Unauthorized"
    );
    _;
}
```

### Reentrancy Protection
```solidity
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract OptionsHook is ReentrancyGuard {
    function exerciseOption(bytes32 orderHash) 
        external 
        nonReentrant 
    {
        // Exercise logic
    }
}
```

### Oracle Security
```solidity
function _validatePrice(address oracle, uint256 price) internal view {
    require(price > 0, "Invalid price");
    require(
        block.timestamp - oracle.updatedAt() < MAX_PRICE_AGE,
        "Stale price"
    );
}
```

## Testing Strategy

### Unit Tests
```typescript
describe("OptionsHook", () => {
  it("should create covered call option", async () => {
    const tx = await optionsHook.createCoveredCall(
      WETH_ADDRESS,
      ethers.utils.parseEther("1"),
      ethers.utils.parseEther("2000"),
      Math.floor(Date.now() / 1000) + 86400, // 1 day
      ethers.utils.parseEther("50")
    );
    
    expect(tx).to.emit(optionsHook, "OptionCreated");
  });
});
```

### Integration Tests
```typescript
describe("Integration with 1inch LOP", () => {
  it("should integrate with limit order protocol", async () => {
    // Test full integration flow
  });
});
```

## Deployment Strategy

### Testnet Deployment
1. Deploy on Goerli testnet
2. Comprehensive testing with mock oracles
3. Community testing and feedback

### Mainnet Deployment  
1. Security audit completion
2. Gradual rollout with limits
3. Full feature activation

### Monitoring
```solidity
event OptionMetrics(
    uint256 totalVolume,
    uint256 openInterest,
    uint256 totalPremium
);

function updateMetrics() external {
    emit OptionMetrics(
        totalVolume,
        openInterest, 
        totalPremium
    );
}
```

This technical specification provides the foundation for implementing options trading on the 1inch Limit Order Protocol, ensuring security, efficiency, and seamless integration with existing infrastructure.