const { expect } = require('chai');
const { ethers } = require('hardhat');
const { loadFixture } = require('@nomicfoundation/hardhat-toolbox/network-helpers');

const CAP = ethers.parseEther('1000000000');
const QUEUE_PRICE = ethers.parseEther('100');  // 100 $TAPES per queue
const BURN_BPS = 7000n;                        // 70% burned, 30% to treasury
const BPS = 10_000n;
const TAPE_PRICE = ethers.parseEther('0.05');

describe('Jukebox', function () {
  async function deploy() {
    const [owner, treasury, creator, listener, stranger] = await ethers.getSigners();

    const Tapes = await ethers.getContractFactory('TapesToken');
    const tapes = await Tapes.deploy('TAPES', 'TAPES', CAP, owner.address);

    const MixTape = await ethers.getContractFactory('MixTape');
    const mixtape = await MixTape.deploy(
      'MIX TAPE OS', 'TAPE', 'https://api.mixtape.os/tape/',
      'https://api.mixtape.os/collection.json', treasury.address, 500, owner.address,
    );

    const Jukebox = await ethers.getContractFactory('Jukebox');
    const jukebox = await Jukebox.deploy(
      await tapes.getAddress(), await mixtape.getAddress(),
      treasury.address, QUEUE_PRICE, BURN_BPS, owner.address,
    );

    // A tape the listener owns, and $TAPES to spend.
    await mixtape.connect(creator).publishTape(100, TAPE_PRICE, 500, 0, '');
    await mixtape.connect(listener).mint(1n, 1, { value: TAPE_PRICE });
    const tokenId = await mixtape.tokenIdFor(1n, 1n);
    await tapes.connect(owner).mint(listener.address, ethers.parseEther('10000'));

    return { tapes, mixtape, jukebox, owner, treasury, creator, listener, stranger, tokenId };
  }

  async function approved() {
    const f = await loadFixture(deploy);
    await f.tapes.connect(f.listener).approve(await f.jukebox.getAddress(), ethers.MaxUint256);
    return f;
  }

  it('queues a tape you own and emits its position', async function () {
    const { jukebox, listener, tokenId } = await approved();
    const burned = (QUEUE_PRICE * BURN_BPS) / BPS;

    await expect(jukebox.connect(listener).queue(tokenId))
      .to.emit(jukebox, 'Queued')
      .withArgs(listener.address, tokenId, 1n, 1n, QUEUE_PRICE, burned);

    expect(await jukebox.queueLength()).to.equal(1n);
  });

  it('burns the burn share and sends the rest to the treasury', async function () {
    const { jukebox, tapes, treasury, listener, tokenId } = await approved();
    const before = await tapes.totalSupply();
    const burned = (QUEUE_PRICE * BURN_BPS) / BPS;

    await jukebox.connect(listener).queue(tokenId);

    expect(await tapes.totalSupply()).to.equal(before - burned);
    expect(await tapes.balanceOf(treasury.address)).to.equal(QUEUE_PRICE - burned);
    expect(await tapes.balanceOf(await jukebox.getAddress())).to.equal(0n);
  });

  it('increments positions across callers', async function () {
    const { jukebox, tapes, mixtape, listener, stranger, tokenId } = await approved();
    await mixtape.connect(stranger).mint(1n, 1, { value: TAPE_PRICE });
    const otherId = await mixtape.tokenIdFor(1n, 2n);

    const [owner] = await ethers.getSigners();
    await tapes.connect(owner).mint(stranger.address, ethers.parseEther('1000'));
    await tapes.connect(stranger).approve(await jukebox.getAddress(), ethers.MaxUint256);

    await jukebox.connect(listener).queue(tokenId);
    await expect(jukebox.connect(stranger).queue(otherId))
      .to.emit(jukebox, 'Queued')
      .withArgs(stranger.address, otherId, 1n, 2n, QUEUE_PRICE, (QUEUE_PRICE * BURN_BPS) / BPS);
  });

  it('refuses to queue a tape you do not own', async function () {
    const { jukebox, tapes, stranger, tokenId } = await approved();
    const [owner] = await ethers.getSigners();
    await tapes.connect(owner).mint(stranger.address, ethers.parseEther('1000'));
    await tapes.connect(stranger).approve(await jukebox.getAddress(), ethers.MaxUint256);

    await expect(jukebox.connect(stranger).queue(tokenId))
      .to.be.revertedWithCustomError(jukebox, 'NotYourTape');
  });

  it('allows queueing any tape once ownership is not required', async function () {
    const { jukebox, tapes, owner, stranger, tokenId } = await approved();
    await jukebox.connect(owner).setRequireOwnership(false);
    await tapes.connect(owner).mint(stranger.address, ethers.parseEther('1000'));
    await tapes.connect(stranger).approve(await jukebox.getAddress(), ethers.MaxUint256);

    await expect(jukebox.connect(stranger).queue(tokenId)).to.not.be.reverted;
  });

  it('fails without a $TAPES allowance', async function () {
    const { jukebox, listener, tokenId } = await loadFixture(deploy);
    await expect(jukebox.connect(listener).queue(tokenId)).to.be.reverted;
  });

  it('fails when the listener cannot cover the price', async function () {
    const { jukebox, tapes, listener, tokenId } = await approved();
    await tapes.connect(listener).burn(await tapes.balanceOf(listener.address));
    await expect(jukebox.connect(listener).queue(tokenId)).to.be.reverted;
  });

  it('burns everything at burnBps = 100%', async function () {
    const { jukebox, tapes, owner, treasury, listener, tokenId } = await approved();
    await jukebox.connect(owner).setBurnBps(10_000);
    const before = await tapes.totalSupply();

    await jukebox.connect(listener).queue(tokenId);

    expect(await tapes.totalSupply()).to.equal(before - QUEUE_PRICE);
    expect(await tapes.balanceOf(treasury.address)).to.equal(0n);
  });

  it('burns nothing at burnBps = 0', async function () {
    const { jukebox, tapes, owner, treasury, listener, tokenId } = await approved();
    await jukebox.connect(owner).setBurnBps(0);
    const before = await tapes.totalSupply();

    await jukebox.connect(listener).queue(tokenId);

    expect(await tapes.totalSupply()).to.equal(before);
    expect(await tapes.balanceOf(treasury.address)).to.equal(QUEUE_PRICE);
  });

  it('queues for free when the price is zero', async function () {
    const { jukebox, tapes, owner, listener, tokenId } = await loadFixture(deploy);
    await jukebox.connect(owner).setQueuePrice(0);
    const before = await tapes.balanceOf(listener.address);

    await expect(jukebox.connect(listener).queue(tokenId)).to.not.be.reverted;
    expect(await tapes.balanceOf(listener.address)).to.equal(before);
  });

  it('queues in one transaction with permit', async function () {
    const { jukebox, tapes, listener, tokenId } = await loadFixture(deploy);
    const deadline = ethers.MaxUint256;
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
    const sig = ethers.Signature.from(await listener.signTypedData(domain, types, {
      owner: listener.address, spender: await jukebox.getAddress(),
      value: QUEUE_PRICE, nonce: await tapes.nonces(listener.address), deadline,
    }));

    await expect(jukebox.connect(listener)
      .queueWithPermit(tokenId, QUEUE_PRICE, deadline, sig.v, sig.r, sig.s))
      .to.emit(jukebox, 'Queued');
  });

  it('still queues if the permit was already used (front-run safe)', async function () {
    const { jukebox, listener, tokenId } = await approved(); // allowance already set
    const bogus = { v: 27, r: ethers.ZeroHash, s: ethers.ZeroHash };
    await expect(jukebox.connect(listener)
      .queueWithPermit(tokenId, QUEUE_PRICE, ethers.MaxUint256, bogus.v, bogus.r, bogus.s))
      .to.emit(jukebox, 'Queued');
  });

  describe('admin', function () {
    it('rejects a burn share above 100%', async function () {
      const { jukebox, owner } = await loadFixture(deploy);
      await expect(jukebox.connect(owner).setBurnBps(10_001))
        .to.be.revertedWithCustomError(jukebox, 'BadBps');
    });

    it('rejects zero addresses in the constructor', async function () {
      const { tapes, mixtape, owner } = await loadFixture(deploy);
      const J = await ethers.getContractFactory('Jukebox');
      await expect(J.deploy(await tapes.getAddress(), await mixtape.getAddress(),
        ethers.ZeroAddress, QUEUE_PRICE, BURN_BPS, owner.address))
        .to.be.revertedWithCustomError(J, 'ZeroAddress');
    });

    it('keeps admin functions to the owner', async function () {
      const { jukebox, stranger } = await loadFixture(deploy);
      for (const call of [
        jukebox.connect(stranger).setQueuePrice(1n),
        jukebox.connect(stranger).setBurnBps(1),
        jukebox.connect(stranger).setTreasury(stranger.address),
        jukebox.connect(stranger).pause(),
      ]) {
        await expect(call).to.be.revertedWithCustomError(jukebox, 'OwnableUnauthorizedAccount');
      }
    });

    it('pauses and resumes queueing', async function () {
      const { jukebox, owner, listener, tokenId } = await approved();
      await jukebox.connect(owner).pause();
      await expect(jukebox.connect(listener).queue(tokenId))
        .to.be.revertedWithCustomError(jukebox, 'EnforcedPause');

      await jukebox.connect(owner).unpause();
      await expect(jukebox.connect(listener).queue(tokenId)).to.not.be.reverted;
    });
  });
});
