# Permission Hierarchy

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
