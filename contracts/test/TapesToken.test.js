const { expect } = require('chai');
const { ethers } = require('hardhat');
const { loadFixture } = require('@nomicfoundation/hardhat-toolbox/network-helpers');

const CAP = ethers.parseEther('1000000000'); // 1B $TAPES

describe('TapesToken', function () {
  async function deploy() {
    const [owner, launchpad, holder, stranger] = await ethers.getSigners();
    const T = await ethers.getContractFactory('TapesToken');
    const tapes = await T.deploy('TAPES', 'TAPES', CAP, owner.address);
    return { tapes, owner, launchpad, holder, stranger };
  }

  it('starts with zero supply and the full cap mintable', async function () {
    const { tapes } = await loadFixture(deploy);
    expect(await tapes.totalSupply()).to.equal(0n);
    expect(await tapes.cap()).to.equal(CAP);
    expect(await tapes.mintable()).to.equal(CAP);
  });

  it('rejects a zero cap', async function () {
    const [owner] = await ethers.getSigners();
    const T = await ethers.getContractFactory('TapesToken');
    await expect(T.deploy('TAPES', 'TAPES', 0, owner.address))
      .to.be.revertedWithCustomError(T, 'ZeroCap');
  });

  it('lets the owner mint and tracks what is left', async function () {
    const { tapes, owner, holder } = await loadFixture(deploy);
    const amount = ethers.parseEther('1000');
    await tapes.connect(owner).mint(holder.address, amount);
    expect(await tapes.balanceOf(holder.address)).to.equal(amount);
    expect(await tapes.mintable()).to.equal(CAP - amount);
  });

  it('lets an authorised minter mint, and stops it after revocation', async function () {
    const { tapes, owner, launchpad, holder } = await loadFixture(deploy);
    await expect(tapes.connect(owner).setMinter(launchpad.address, true))
      .to.emit(tapes, 'MinterSet').withArgs(launchpad.address, true);

    await tapes.connect(launchpad).mint(holder.address, 100n);
    expect(await tapes.balanceOf(holder.address)).to.equal(100n);

    await tapes.connect(owner).setMinter(launchpad.address, false);
    await expect(tapes.connect(launchpad).mint(holder.address, 1n))
      .to.be.revertedWithCustomError(tapes, 'NotMinter');
  });

  it('refuses minting from an unauthorised account', async function () {
    const { tapes, stranger } = await loadFixture(deploy);
    await expect(tapes.connect(stranger).mint(stranger.address, 1n))
      .to.be.revertedWithCustomError(tapes, 'NotMinter');
  });

  it('never exceeds the cap, in one mint or across several', async function () {
    const { tapes, owner, holder } = await loadFixture(deploy);
    await expect(tapes.connect(owner).mint(holder.address, CAP + 1n))
      .to.be.revertedWithCustomError(tapes, 'CapExceeded');

    await tapes.connect(owner).mint(holder.address, CAP - 10n);
    await expect(tapes.connect(owner).mint(holder.address, 11n))
      .to.be.revertedWithCustomError(tapes, 'CapExceeded');
    await expect(tapes.connect(owner).mint(holder.address, 10n)).to.not.be.reverted;
    expect(await tapes.totalSupply()).to.equal(CAP);
  });

  it('frees cap space again when tokens are burned', async function () {
    const { tapes, owner, holder } = await loadFixture(deploy);
    await tapes.connect(owner).mint(holder.address, CAP);
    await tapes.connect(holder).burn(ethers.parseEther('100'));
    expect(await tapes.mintable()).to.equal(ethers.parseEther('100'));
  });

  it('supports EIP-2612 permit', async function () {
    const { tapes, owner, holder, stranger } = await loadFixture(deploy);
    await tapes.connect(owner).mint(holder.address, 1000n);

    const deadline = ethers.MaxUint256;
    const nonce = await tapes.nonces(holder.address);
    const domain = {
      name: 'TAPES', version: '1',
      chainId: (await ethers.provider.getNetwork()).chainId,
      verifyingContract: await tapes.getAddress(),
    };
    const types = {
      Permit: [
        { name: 'owner', type: 'address' }, { name: 'spender', type: 'address' },
        { name: 'value', type: 'uint256' }, { name: 'nonce', type: 'uint256' },
        { name: 'deadline', type: 'uint256' },
      ],
    };
    const sig = ethers.Signature.from(await holder.signTypedData(domain, types, {
      owner: holder.address, spender: stranger.address, value: 500n, nonce, deadline,
    }));

    await tapes.permit(holder.address, stranger.address, 500n, deadline, sig.v, sig.r, sig.s);
    expect(await tapes.allowance(holder.address, stranger.address)).to.equal(500n);
  });

  it('keeps setMinter to the owner', async function () {
    const { tapes, stranger } = await loadFixture(deploy);
    await expect(tapes.connect(stranger).setMinter(stranger.address, true))
      .to.be.revertedWithCustomError(tapes, 'OwnableUnauthorizedAccount');
  });
});
