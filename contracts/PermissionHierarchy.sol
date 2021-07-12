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
    uint256 constant PRICE_PER_ACCOUNT = 1e16; // 0.001 ETH
    uint256 constant FEE_DENOMINATOR = 100;
    uint256 public immutable maxCount;
    address public treasury;
    uint256 public fee;

    mapping(address => Account) public accounts;

    // =================== Modifier ===================
    modifier hasAddPermission() {
        require(
            !accounts[msg.sender].isRemoved &&
                accounts[msg.sender].role % 2 == 1,
            "Sender has no permission to add"
        );
        _;
    }

    modifier hasRemovePermission() {
        require(
            !accounts[msg.sender].isRemoved && accounts[msg.sender].role > 2,
            "Sender has no permission to remove"
        );
        _;
    }

    // =================== Constructor ===================
    constructor(
        address _treasury,
        uint256 _fee,
        uint256 _maxCount
    ) {
        require(_treasury != address(0), "Treasury cannot be zero address");
        require(_maxCount > 1, "Max account number must be bigger than 1");

        treasury = _treasury;
        fee = _fee;
        maxCount = _maxCount;
        address[] memory children;
        accounts[msg.sender] = Account({
            parent: address(0),
            children: children,
            role: 3,
            isRemoved: false
        });
        emit AccountAdded(msg.sender);
    }

    // =================== Mutable Functions ===================
    function addAccount(address account, uint8 newRole)
        public
        payable
        hasAddPermission()
    {
        uint256 count = accounts[msg.sender].children.length + 1;
        require(count <= maxCount, "Maximum count reached");
        require(account != address(0), "Cannot add zero-address account");
        require(
            account != msg.sender && accounts[account].parent == address(0),
            "Account already exists"
        );
        require(newRole >= 0 && newRole < 4, "Unidentified role value");
        require(
            msg.value >= count * PRICE_PER_ACCOUNT,
            "Pay amount is not enough to add"
        );

        accounts[msg.sender].children.push(account);
        if (accounts[msg.sender].children.length == maxCount) {
            emit MaxCountReached(msg.sender);
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
        accounts[msg.sender].parent.call{value: _fee}("");
        treasury.call{value: msg.value - _fee}("");
    }

    function addAccount(address account) public payable hasAddPermission() {
        uint256 count = accounts[msg.sender].children.length + 1;
        require(count <= maxCount, "Maximum count reached");
        require(account != address(0), "Cannot add zero-address account");
        require(
            account != msg.sender && accounts[account].parent == address(0),
            "Account already exists"
        );
        require(
            msg.value >= count * PRICE_PER_ACCOUNT,
            "Pay amount is not enough to add this account"
        );

        accounts[msg.sender].children.push(account);
        if (accounts[msg.sender].children.length == maxCount) {
            emit MaxCountReached(msg.sender);
        }

        address[] memory children;
        accounts[account] = Account({
            parent: msg.sender,
            children: children,
            role: accounts[msg.sender].role,
            isRemoved: false
        });
        emit AccountAdded(account);

        uint256 _fee = (msg.value * fee) / FEE_DENOMINATOR;
        accounts[msg.sender].parent.call{value: _fee}("");
        treasury.call{value: msg.value - _fee}("");
    }

    function removeAccount(address account) public hasRemovePermission() {
        require(account != address(0), "Cannot remove zero-address account");
        require(
            account != msg.sender && accounts[account].parent != address(0),
            "Account not exists"
        );
        accounts[account].isRemoved = true;
        emit AccountRemoved(account);
    }

    // =================== View Functions ===================
    function child(address account, uint256 i) public view returns (address) {
        return accounts[account].children[i];
    }

    function parent(address account) public view returns (address) {
        return accounts[account].parent;
    }

    function role(address account) public view returns (uint8) {
        return accounts[account].role;
    }

    function isAlive(address account) public view returns (bool) {
        return !accounts[account].isRemoved;
    }

    // =================== Events ===================
    event AccountAdded(address indexed account);
    event AccountRemoved(address indexed account);
    event MaxCountReached(address indexed account);
}
