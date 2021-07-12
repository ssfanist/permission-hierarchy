const { expect } = require('chai');
const { BN, expectRevert, expectEvent } = require('@openzeppelin/test-helpers');
const { ZERO_ADDRESS } = require('@openzeppelin/test-helpers/src/constants');
const PermissionHierarchy = artifacts.require('PermissionHierarchy');

contract(PermissionHierarchy, ([deployer, treasury, user1, user2, user3]) => {
  before(() => {
    this.PRICE = new BN('10000000000000000');
  });

  describe('constructor', async () => {
    it('when treasury is zero address', async () => {
      await expectRevert(
        PermissionHierarchy.new(ZERO_ADDRESS, 1, 2),
        'Treasury cannot be zero address',
      );
    });

    it('when maxCount is below 2', async () => {
      await expectRevert(
        PermissionHierarchy.new(treasury, 1, 1),
        'Max account number must be bigger than 1',
      );
    });
  });

  describe('add account', async () => {
    beforeEach(async () => {
      this.hierarchy = await PermissionHierarchy.new(treasury, 1, 2);
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
      await this.hierarchy.methods['addAccount(address)'](user1, {
        from: deployer,
        value: this.PRICE,
      });
      await expectRevert(
        this.hierarchy.methods['addAccount(address)'](user1, {
          from: deployer,
          value: this.PRICE,
        }),
        'Account already exists',
      );
    });

    it('when adding with unidentified role', async () => {
      await expectRevert(
        this.hierarchy.methods['addAccount(address,uint8)'](user1, 4),
        'Unidentified role value',
      );
    });

    it('when adding over max count', async () => {
      await this.hierarchy.methods['addAccount(address)'](user1, {
        value: this.PRICE,
      });
      const receipt = await this.hierarchy.methods['addAccount(address)'](
        user2,
        {
          value: this.PRICE.mul(new BN(2)),
        },
      );
      expectEvent(receipt, 'MaxCountReached', { account: deployer });
      await expectRevert(
        this.hierarchy.methods['addAccount(address)'](user3, {
          value: this.PRICE,
        }),
        'Maximum count reached',
      );
    });

    it('when no add permission', async () => {
      await this.hierarchy.methods['addAccount(address,uint8)'](user1, 0, {
        value: this.PRICE,
      });
      await expectRevert(
        this.hierarchy.methods['addAccount(address)'](user2, {
          from: user1,
          value: this.PRICE,
        }),
        'Sender has no permission to add',
      );
    });

    it('when not enough pay amount', async () => {
      await this.hierarchy.methods['addAccount(address,uint8)'](user1, 3, {
        value: this.PRICE,
      });
      await expectRevert(
        this.hierarchy.methods['addAccount(address,uint8)'](user2, 3, {
          value: this.PRICE,
        }),
        'Pay amount is not enough to add',
      );
    });
  });

  describe('remove account', async () => {
    beforeEach(async () => {
      this.hierarchy = await PermissionHierarchy.new(treasury, 1, 2);
    });

    it('when removing zero', async () => {
      await expectRevert(
        this.hierarchy.removeAccount(ZERO_ADDRESS),
        'Cannot remove zero-address account',
      );
    });

    it('when removing non-existing account', async () => {
      await expectRevert(
        this.hierarchy.removeAccount(user1),
        'Account not exists',
      );
    });
  });

  describe('structure', async () => {
    beforeEach(async () => {
      this.hierarchy = await PermissionHierarchy.new(treasury, 1, 2);
    });

    it("creator's parent", async () => {
      expect(await this.hierarchy.parent(deployer)).to.equal(ZERO_ADDRESS);
    });

    it("user's parent", async () => {
      await this.hierarchy.methods['addAccount(address,uint8)'](user1, 3, {
        value: this.PRICE,
      });
      expect(await this.hierarchy.parent(user1)).to.equal(deployer);
    });

    it("creator's children", async () => {
      await this.hierarchy.methods['addAccount(address,uint8)'](user1, 3, {
        value: this.PRICE,
      });
      await this.hierarchy.methods['addAccount(address,uint8)'](user2, 3, {
        value: this.PRICE.mul(new BN(2)),
      });
      expect(await this.hierarchy.child(deployer, 0)).to.equal(user1);
      expect(await this.hierarchy.child(deployer, 1)).to.equal(user2);
    });

    it("user's role", async () => {
      await this.hierarchy.methods['addAccount(address,uint8)'](user1, 2, {
        value: this.PRICE,
      });
      expect((await this.hierarchy.role(deployer)).toNumber()).to.equal(3);
      expect((await this.hierarchy.role(user1)).toNumber()).to.equal(2);
    });

    it("user's role", async () => {
      await this.hierarchy.methods['addAccount(address,uint8)'](user1, 2, {
        value: this.PRICE,
      });
      await this.hierarchy.removeAccount(user1);
      expect(await this.hierarchy.isAlive(deployer)).to.equal(true);
      expect(await this.hierarchy.isAlive(user1)).to.equal(false);
    });
  });
});
