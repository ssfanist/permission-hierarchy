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
    }

    // =================== State Variables ===================
    uint256 constant PRICE_PER_ACCOUNT = 1e16; // 0.001 ETH
    uint256 public immutable maxCount;
    address public treasury;

    mapping(address => Account) public accounts;

    // =================== Modifier ===================
    modifier hasAddPermission() {
        require(
            accounts[msg.sender].role % 2 == 1,
            "Sender has no permission to add"
        );
        _;
    }

    modifier hasRemovePermission() {
        require(
            accounts[msg.sender].role > 2,
            "Sender has no permission to remove"
        );
        _;
    }

    // =================== Constructor ===================
    constructor(address _treasury, uint256 _maxCount) {
        require(_treasury != address(0), "Treasury cannot be zero address");
        require(_maxCount > 1, "Max account number must be bigger than 1");

        treasury = _treasury;
        maxCount = _maxCount;
        address[] memory children;
        accounts[msg.sender] = Account({
            parent: address(0),
            children: children,
            role: 3
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
            role: newRole
        });
        emit AccountAdded(account);
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
            role: accounts[msg.sender].role
        });
        emit AccountAdded(account);
    }

    function removeAccount(address account)
        public
        hasRemovePermission()
        returns (bool)
    {
        require(account != address(0), "Cannot remove zero-address account");

        address[] storage children = accounts[msg.sender].children;
        for (uint256 i = 0; i < children.length; i++) {
            if (children[i] == account) {
                children[i] = children[children.length - 1];
                children.pop();
                emit AccountRemoved(account);

                for (
                    uint256 j = 0;
                    j < accounts[account].children.length;
                    j++
                ) {
                    children.push(accounts[account].children[j]);
                }
                return true;
            }
        }
        return false;
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

    // =================== Events ===================
    event AccountAdded(address indexed account);
    event AccountRemoved(address indexed account);
    event MaxCountReached(address indexed account);
}
