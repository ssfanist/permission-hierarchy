const { expect } = require('chai');
const { BN, expectRevert, expectEvent } = require('@openzeppelin/test-helpers');
const { ZERO_ADDRESS } = require('@openzeppelin/test-helpers/src/constants');
const { web3 } = require('@openzeppelin/test-helpers/src/setup');
const PermissionHierarchy = artifacts.require('PermissionHierarchy');

contract(PermissionHierarchy, ([_, root, treasury, A, B, C, D, E]) => {
  before(() => {
    this.PRICE = new BN('10000000000000000'); // 1e16 = 0.001 ETH
  });

  describe('constructor', async () => {
    it('revert when root is zero address', async () => {
      await expectRevert(
        PermissionHierarchy.new(ZERO_ADDRESS, treasury, 1, 2),
        'Root cannot be zero address',
      );
    });

    it('revert when treasury is zero address', async () => {
      await expectRevert(
        PermissionHierarchy.new(root, ZERO_ADDRESS, 1, 2),
        'Treasury cannot be zero address',
      );
    });

    it('revert when fee is bigger than denominator', async () => {
      await expectRevert(
        PermissionHierarchy.new(root, treasury, 101, 1),
        'Fee numerator cannot be bigger than denominator',
      );
    });

    it('revert when maxCount is below 2', async () => {
      await expectRevert(
        PermissionHierarchy.new(root, treasury, 1, 1),
        'Max count must be bigger than 1',
      );
    });

    it('properly set', async () => {
      const hierarchy = await PermissionHierarchy.new(root, treasury, 1, 2);
      expect(await hierarchy.root()).equal(root);
      expect(await hierarchy.treasury()).equal(treasury);
      expect((await hierarchy.fee()).toNumber()).equal(1);
      expect((await hierarchy.maxCount()).toNumber()).equal(2);
    });
  });

  describe('add account', async () => {
    beforeEach(async () => {
      this.hierarchy = await PermissionHierarchy.new(root, treasury, 1, 2);
    });

    it('revert when non-permission attempts', async () => {
      await expectRevert(
        this.hierarchy.methods['addAccount(address)'](A, {
          value: this.PRICE,
        }),
        'Sender has no permission to add',
      );
    });

    it('revert when removed account attempts', async () => {
      const receipt = await this.hierarchy.methods['addAccount(address)'](A, {
        from: root,
        value: this.PRICE,
      });
      expectEvent(receipt, 'AccountAdded', { account: A });
      await this.hierarchy.removeAccount(A, { from: root });
      await expectRevert(
        this.hierarchy.methods['addAccount(address)'](B, {
          from: A,
          value: this.PRICE,
        }),
        'Sender has been removed from hierarchy',
      );
    });

    it('revert when adding zero-address account', async () => {
      await expectRevert(
        this.hierarchy.methods['addAccount(address,uint8)'](ZERO_ADDRESS, 0, {
          from: root,
        }),
        'Cannot add zero-address account',
      );
      await expectRevert(
        this.hierarchy.methods['addAccount(address)'](ZERO_ADDRESS, {
          from: root,
        }),
        'Cannot add zero-address account',
      );
    });

    it('revert when adding root account', async () => {
      await expectRevert(
        this.hierarchy.methods['addAccount(address)'](root, { from: root }),
        'Cannot add root account',
      );
    });

    it('revert when adding same account', async () => {
      await this.hierarchy.methods['addAccount(address)'](A, {
        from: root,
        value: this.PRICE,
      });
      await expectRevert(
        this.hierarchy.methods['addAccount(address)'](A, {
          from: root,
        }),
        'Account already exists',
      );
    });

    it('revert when adding with unidentified role', async () => {
      await expectRevert(
        this.hierarchy.methods['addAccount(address,uint8)'](A, 4, {
          from: root,
        }),
        'Unidentified role value',
      );
    });

    it('when not enough pay amount', async () => {
      await this.hierarchy.methods['addAccount(address,uint8)'](A, 3, {
        from: root,
        value: this.PRICE,
      });
      await expectRevert(
        this.hierarchy.methods['addAccount(address,uint8)'](B, 3, {
          from: root,
          value: this.PRICE,
        }),
        'Pay amount is not enough to add',
      );
    });

    it('revert when adding over max count', async () => {
      await this.hierarchy.methods['addAccount(address)'](A, {
        from: root,
        value: this.PRICE,
      });
      const receipt = await this.hierarchy.methods['addAccount(address)'](B, {
        from: root,
        value: this.PRICE.mul(new BN(2)),
      });
      expectEvent(receipt, 'MaxCountReached', {
        account: root,
        maxCount: new BN(2),
      });
      expect(await this.hierarchy.child(root, 0)).equal(A);
      expect((await this.hierarchy.childCount(root)).toNumber()).equal(2);
      await expectRevert(
        this.hierarchy.methods['addAccount(address)'](C, {
          from: root,
          value: this.PRICE,
        }),
        'Maximum count reached',
      );
    });

    it('fee calculation', async () => {
      await this.hierarchy.methods['addAccount(address)'](A, {
        from: root,
        value: this.PRICE,
      });
      const beforeBalance = new BN(await web3.eth.getBalance(root));
      await this.hierarchy.methods['addAccount(address)'](B, {
        from: A,
        value: this.PRICE,
      });
      const afterBalance = new BN(await web3.eth.getBalance(root));
      expect(afterBalance.sub(beforeBalance).toString()).equal(
        '100000000000000', // 1e14 = 0.001 ETH * 1%
      );
    });
  });

  describe('remove account', async () => {
    beforeEach(async () => {
      this.hierarchy = await PermissionHierarchy.new(root, treasury, 1, 2);
    });

    it('revert when removing zero', async () => {
      await expectRevert(
        this.hierarchy.removeAccount(ZERO_ADDRESS, { from: root }),
        'Cannot remove zero-address account',
      );
    });

    it('revert when removing root account', async () => {
      await expectRevert(
        this.hierarchy.removeAccount(root, { from: root }),
        'Cannot remove root account',
      );
    });

    it('revert when removing non-existing account', async () => {
      await expectRevert(
        this.hierarchy.removeAccount(A, { from: root }),
        'Account not exists',
      );
    });

    it('revert when non-permission attempts', async () => {
      await this.hierarchy.methods['addAccount(address,uint8)'](A, 1, {
        from: root,
        value: this.PRICE,
      });
      await this.hierarchy.methods['addAccount(address)'](B, {
        from: A,
        value: this.PRICE,
      });

      await expectRevert(
        this.hierarchy.removeAccount(B, { from: A }),
        'Sender has no permission to remove',
      );
    });
  });

  describe('ownable functions', async () => {
    describe('treasury set', async () => {
      beforeEach(async () => {
        this.hierarchy = await PermissionHierarchy.new(root, treasury, 1, 2);
      });

      it('revert when treasury is zero address', async () => {
        await expectRevert(
          this.hierarchy.setTreasury(ZERO_ADDRESS),
          'Treasury cannot be zero address',
        );
      });

      it('revert when non-owner attempts', async () => {
        await expectRevert(
          this.hierarchy.setTreasury(treasury, { from: A }),
          'Ownable: caller is not the owner',
        );
      });

      it('properly set', async () => {
        await this.hierarchy.setTreasury(A);
        expect(await this.hierarchy.treasury()).equal(A);
      });
    });

    describe('fee set', async () => {
      beforeEach(async () => {
        this.hierarchy = await PermissionHierarchy.new(root, treasury, 1, 2);
      });

      it('revert when fee is bigger than denominator', async () => {
        await expectRevert(
          this.hierarchy.setFee(101),
          'Fee numerator cannot be bigger than denominator',
        );
      });

      it('revert when non-owner attempts', async () => {
        await expectRevert(
          this.hierarchy.setFee(2, { from: A }),
          'Ownable: caller is not the owner',
        );
      });

      it('properly set', async () => {
        await this.hierarchy.setFee(2);
        expect((await this.hierarchy.fee()).toNumber()).equal(2);
      });
    });

    describe('maxCount set', async () => {
      beforeEach(async () => {
        this.hierarchy = await PermissionHierarchy.new(root, treasury, 1, 2);
      });

      it('revert when maxCount is smaller than 2', async () => {
        await expectRevert(
          this.hierarchy.setMaxCount(1),
          'Max count must be bigger than 1',
        );
      });

      it('revert when non-owner attempts', async () => {
        await expectRevert(
          this.hierarchy.setMaxCount(2, { from: A }),
          'Ownable: caller is not the owner',
        );
      });

      it('properly set', async () => {
        await this.hierarchy.setMaxCount(3);
        expect((await this.hierarchy.maxCount()).toNumber()).equal(3);
      });
    });
  });
});
