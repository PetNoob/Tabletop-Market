// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/*
  Tabletop Market - escrow on Arc

  What it does, in plain words:
    - When a user makes a pick, their USDC is sent here and LOCKED under that pick.
    - Each lock is stored with a public receipt: which market, which answer, the odds,
      and (in live mode) the number of the matching order on Gemini.
    - When the user cashes out part or all of a pick, that share of the locked USDC
      is sent straight back to them. Nobody else can take it: there is no owner and
      no admin function in this contract.

  What it does NOT do (yet):
    - It does not pay winnings. It holds and returns the stake. Profit and loss
      come from the market itself (Gemini). A payout pool and a result reporter
      are the next step.

  On Arc, USDC is the native currency, so "msg.value" below IS USDC (18 decimals).
*/
contract TabletopEscrow {
    struct Position {
        uint256 locked;   // USDC locked under this pick right now
        uint64 picks;     // how many times the user added to it
    }

    // user => pick key => position.  The key is a hash of "market | answer | yes or no".
    mapping(address => mapping(bytes32 => Position)) public positions;
    uint256 public totalLocked;

    event PickPlaced(address indexed user, bytes32 indexed key, uint256 amount, uint32 oddsBps, string receipt);
    event CashedOut(address indexed user, bytes32 indexed key, uint256 amount, uint32 shareBps, string receipt);

    // Lock the USDC sent with this call under `key`.
    // oddsBps = the odds at that moment, in hundredths of a percent (7650 = 76.5%).
    // receipt = a short readable note, for example: "Orlando vs Boston | Boston | yes | gemini:12345"
    function placePick(bytes32 key, uint32 oddsBps, string calldata receipt) external payable {
        require(msg.value > 0, "no stake sent");
        require(oddsBps > 0 && oddsBps < 10000, "odds out of range");
        Position storage p = positions[msg.sender][key];
        p.locked += msg.value;
        p.picks += 1;
        totalLocked += msg.value;
        emit PickPlaced(msg.sender, key, msg.value, oddsBps, receipt);
    }

    // Release a share of the caller's own locked USDC back to the caller.
    // shareBps = how much of it, in hundredths of a percent (10000 = all, 5000 = half).
    function cashOut(bytes32 key, uint32 shareBps, string calldata receipt) external {
        require(shareBps > 0 && shareBps <= 10000, "share out of range");
        Position storage p = positions[msg.sender][key];
        uint256 amount = (p.locked * shareBps) / 10000;
        require(amount > 0, "nothing locked");
        p.locked -= amount;
        totalLocked -= amount;
        (bool ok, ) = msg.sender.call{value: amount}("");
        require(ok, "USDC transfer failed");
        emit CashedOut(msg.sender, key, amount, shareBps, receipt);
    }

    function lockedOf(address user, bytes32 key) external view returns (uint256) {
        return positions[user][key].locked;
    }
}
