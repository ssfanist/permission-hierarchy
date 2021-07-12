const { expect } = require('chai');
const { BN, expectRevert } = require('@openzeppelin/test-helpers');
const { ZERO_ADDRESS } = require('@openzeppelin/test-helpers/src/constants');
const expectEvent = require('@openzeppelin/test-helpers/src/expectEvent');
const PermissionHierarchy = artifacts.require('PermissionHierarchy');

contract(PermissionHierarchy, ([_, treasury, user1, user2, user3]) => {
  describe('constructor', async () => {
    it('when treasury is zero address', async () => {
      await expectRevert(
        PermissionHierarchy.new(ZERO_ADDRESS, 2),
        'Treasury cannot be zero address',
      );
    });

    it('when maxCount is below 2', async () => {
      await expectRevert(
        PermissionHierarchy.new(treasury, 1),
        'Max account number must be bigger than 1',
      );
    });
  });

  describe('add account', async () => {
    beforeEach(async () => {
      this.hierarchy = await PermissionHierarchy.new(treasury, 2);
      this.PRICE = '1000000000000000000';
    });

    it('when adding zero', async () => {
      await expectRevert(
        this.hierarchy.addAccount(ZERO_ADDRESS),
        'Cannot add zero-address account',
      );
      await expectRevert(
        this.hierarchy.addAccount(ZERO_ADDRESS, 0),
        'Cannot add zero-address account',
      );
    });

    it('when adding same account', async () => {
      await this.hierarchy.addAccount(user1, {
        value: this.PRICE,
      });
      await expectRevert(
        this.hierarchy.addAccount(user1, { value: this.PRICE }),
        'Account already exists',
      );
    });

    it('when adding with unidentified role', async () => {
      await expectRevert(
        this.hierarchy.addAccount(user1, 4),
        'Unidentified role value',
      );
    });

    it('when adding over max count', async () => {
      await this.hierarchy.addAccount(user1, {
        value: this.PRICE,
      });
      let receipt = await this.hierarchy.addAccount(user2, {
        value: this.PRICE.mul(2),
      });
      await expectEvent.inTransaction(
        receipt.hash,
        this.hierarchy,
        'MaxCountReached',
      );
      await expectRevert(
        this.hierarchy.addAccount(user3, { value: this.PRICE }),
        'Maximum count reached',
      );
    });

    it('when no add permission', async () => {
      await this.hierarchy.addAccount(user1, 0, {
        value: this.PRICE,
      });
      await expectRevert(
        this.hierarchy.addAccount(user2, {
          from: user1,
          value: this.PRICE,
        }),
        'Sender has no permission to add',
      );
    });

    it('when not enough pay amount', async () => {
      await this.hierarchy.addAccount(user1, 3, {
        value: this.PRICE,
      });
      await expectRevert(
        this.hierarchy.addAccount(user2, 3, {
          value: this.PRICE,
        }),
        'Pay amount is not enough to add',
      );
    });
  });

  describe('remove account', async () => {
    beforeEach(async () => {
      this.hierarchy = await PermissionHierarchy.new(treasury, 2);
      this.PRICE = '1000000000000000000';
    });

    it('when removing zero', async () => {
      await expectRevert(
        this.hierarchy.removeAccount(ZERO_ADDRESS),
        'Cannot remove zero-address account',
      );
    });
  });
});
