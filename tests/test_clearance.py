# Test suite for clearance.py using gltest
import pytest

CLAIM_DEPOSIT_MIN = 10_000_000_000_000_000 # 0.01 GEN in wei


def test_clearance_happy_path(gl):
    artist = gl.accounts[0]
    remixer = gl.accounts[1]

    # Deploy contract
    contract = gl.deploy("contracts/clearance.py")

    # 1. Register Work
    tx = contract.connect(artist).register_work(
        args=["Midnight City Sample", "https://soundcloud.com/artist/midnight", "Samples under 5s allowed. 20% royalty split. No alcohol ads."]
    ).transact()
    work_id = tx.return_value

    assert work_id == "0"

    work_data = contract.get_work(args=[work_id]).call()
    assert work_data["title"] == "Midnight City Sample"
    assert work_data["artist"].lower() == artist.address.lower()

    # Verify list_works view
    works_list = contract.list_works().call()
    assert len(works_list) == 1
    assert works_list[0]["id"] == "0"
    assert works_list[0]["title"] == "Midnight City Sample"

    # 2. Submit Claim
    tx_claim = contract.connect(remixer).submit_claim(
        args=[work_id, "https://youtube.com/watch?v=remix123", "Used 3s sample loop in intro", 2000]
    ).transact(value=CLAIM_DEPOSIT_MIN)
    claim_id = tx_claim.return_value

    assert claim_id == "0"

    claim_data = contract.get_claim(args=[claim_id]).call()
    assert claim_data["status"] == "PENDING"
    assert claim_data["proposed_split_bps"] == 2000

    # 3. Adjudicate with mocked LLM (APPROVED)
    gl.sim_installMocks({
        "web.render": "Song intro features 3 sec clean sample without commercial endorsements.",
        "exec_prompt": {
            "verdict": "APPROVED",
            "final_split_bps": 2000,
            "reason": "Sample length is 3 seconds, complying with 5s threshold, and 20% proposed split matches terms."
        }
    })

    contract.connect(artist).adjudicate(args=[claim_id]).transact()

    claim_after = contract.get_claim(args=[claim_id]).call()
    assert claim_after["status"] == "APPROVED"
    assert claim_after["final_split_bps"] == 2000
    assert "complying with 5s threshold" in claim_after["reason"]

    # 4. Distribute
    contract.connect(remixer).distribute(args=[claim_id]).transact(value=100_000_000_000_000_000)

    claim_dist = contract.get_claim(args=[claim_id]).call()
    assert claim_dist["distributed"] is True
