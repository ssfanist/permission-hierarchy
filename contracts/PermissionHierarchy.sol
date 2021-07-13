// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";

contract PermissionHierarchy is Ownable {
    struct Account {
        // account address who created this account
        address parent;
        // accounts addresses whom this account created
        address[] children;
        /*
            0(0x00): no permission
            1(0x01): can add
            2(0x10): can remove
            3(0x11): can add or remove
        */
        uint8 role;
        bool isRemoved;
    }

    // =================== State Variables ===================
    // cost charging per account when adding
    uint256 constant PRICE_PER_ACCOUNT = 1e16; // 0.001 ETH
    // fee calculation denominator
    uint256 constant FEE_DENOMINATOR = 100;
    // root of hierarchy
    address public immutable root;
    // treasury address
    address public treasury;
    // fee calculation numerator
    uint256 public fee;
    // max count of children each account can add up to
    uint256 public maxCount;

    mapping(address => Account) public accounts;

    // =================== Modifier ===================
    modifier hasAddPermission {
        require(
            accounts[msg.sender].role % 2 == 1,
            "Sender has no permission to add"
        );
        _;
    }

    modifier hasRemovePermission {
        require(
            accounts[msg.sender].role > 2,
            "Sender has no permission to remove"
        );
        _;
    }

    modifier isAlive {
        require(
            !accounts[msg.sender].isRemoved,
            "Sender has been removed from hierarchy"
        );
        _;
    }

    // =================== Constructor ===================
    constructor(
        address _root,
        address _treasury,
        uint256 _fee,
        uint256 _maxCount
    ) {
        require(_root != address(0), "Root cannot be zero address");
        require(_treasury != address(0), "Treasury cannot be zero address");
        require(
            _fee <= FEE_DENOMINATOR,
            "Fee numerator cannot be bigger than denominator"
        );
        require(_maxCount > 1, "Max count must be bigger than 1");

        root = _root;
        treasury = _treasury;
        fee = _fee;
        maxCount = _maxCount;

        address[] memory children;
        accounts[_root] = Account({
            parent: address(0),
            children: children,
            role: 3,
            isRemoved: false
        });
        emit AccountAdded(_root);
    }

    // =================== Mutable Functions ===================
    // add account with newRole permission
    function addAccount(address account, uint8 newRole)
        external
        payable
        isAlive
        hasAddPermission
    {
        _addAccount(account, newRole);
    }

    // add account with sender's permission
    function addAccount(address account)
        external
        payable
        isAlive
        hasAddPermission
    {
        _addAccount(account, accounts[msg.sender].role);
    }

    function _addAccount(address account, uint8 newRole) internal {
        Account storage creator = accounts[msg.sender];
        uint256 count = creator.children.length + 1;
        require(count <= maxCount, "Maximum count reached");
        require(account != address(0), "Cannot add zero-address account");
        require(account != root, "Cannot add root account");
        require(
            accounts[account].parent == address(0),
            "Account already exists"
        );
        require(newRole >= 0 && newRole < 4, "Unidentified role value");
        require(
            msg.value >= count * PRICE_PER_ACCOUNT,
            "Pay amount is not enough to add"
        );

        creator.children.push(account);
        if (count == maxCount) {
            emit MaxCountReached(msg.sender, maxCount);
        }

        address[] memory children;
        accounts[account] = Account({
            parent: msg.sender,
            children: children,
            role: newRole,
            isRemoved: false
        });
        emit AccountAdded(account);

        uint256 _fee = (msg.value * fee) / FEE_DENOMINATOR;
        if (
            creator.parent == address(0) || accounts[creator.parent].isRemoved
        ) {
            _fee = 0;
        }
        if (_fee > 0) {
            (bool feeSuccess, ) = accounts[msg.sender].parent.call{value: _fee}(
                ""
            );
            require(feeSuccess, "Parent fee payment failed");
        }
        (bool success, ) = treasury.call{value: msg.value - _fee}("");
        require(success, "Treasury payment failed");
    }

    // remove account
    function removeAccount(address account)
        external
        isAlive
        hasRemovePermission
    {
        require(account != address(0), "Cannot remove zero-address account");
        require(account != root, "Cannot remove root account");
        require(accounts[account].parent != address(0), "Account not exists");
        require(!accounts[account].isRemoved, "Account is already removed");

        accounts[account].isRemoved = true;
        emit AccountRemoved(account);
    }

    // =================== View Functions ===================
    function child(address account, uint256 i) external view returns (address) {
        return accounts[account].children[i];
    }

    function childCount(address account) external view returns (uint256) {
        return accounts[account].children.length;
    }

    // =================== Ownable Functions ===================
    function setTreasury(address _treasury) external onlyOwner {
        require(_treasury != address(0), "Treasury cannot be zero address");
        treasury = _treasury;
    }

    function setFee(uint256 _fee) external onlyOwner {
        require(
            _fee <= FEE_DENOMINATOR,
            "Fee numerator cannot be bigger than denominator"
        );
        fee = _fee;
    }

    function setMaxCount(uint256 _maxCount) external onlyOwner {
        require(_maxCount > 1, "Max count must be bigger than 1");
        maxCount = _maxCount;
    }

    // =================== Events ===================
    event AccountAdded(address indexed account);
    event AccountRemoved(address indexed account);
    event MaxCountReached(address indexed account, uint256 maxCount);
}
