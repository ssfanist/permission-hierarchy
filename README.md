# Permission Hierarchy

Root (contract owner) creates a hierarchy with max account count which determines how many children a user can create at most.
Whenever creates account, creator pays 0.001 ETH.
Based on the fee set by root, certain amount goes to parent of creator, and the remaining funds go to treasury address.
If an account is removed, then that account can't neither create/remove account nor get account creation fee from children.

## Struct

- address parent
  - account address who created this account
- address[] children
  - accounts addresses whom this account created
- uint8 role
  - account permission role
    - 0(0x00): no permission
    - 1(0x01): can add
    - 2(0x10): can remove
    - 3(0x11): can add or remove
- bool isRemoved
  - account removal status

## Constructor

- address root: root of hierarchy
- address treasury: treasury to get fee from hierarchy
- uint256 fee: fee amount to take when adding each account
- uint256 maxCount: tree hierarchy dimension

## Functions

- addAccount

  - address account: Account address to add
  - uint256 newRole: Account permission role
    - 0: no permission
    - 1: can only add
    - 2: can only remove
    - 3: can both add or remove

- addAccount

  - address account: Account address to add
    - Role is inherited from parent account

- removeAccount

  - address account: Account address to remove

- child

  - address account: address of parent account of child to read
  - uint256 i: index of children of certain parent

- childCount

  - address account: address of parent to read children count

## Events

- AccountAdded
- AccountRemoved
- MaxCountReached
