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


def test_submit_claim_invalid_split(gl):
    artist = gl.accounts[0]
    remixer = gl.accounts[1]
    contract = gl.deploy("contracts/clearance.py")

    contract.connect(artist).register_work(
        args=["Test Track", "https://soundcloud.com/test", "Standard terms for sampling"]
    ).transact()

    with pytest.raises(Exception) as exc_info:
        contract.connect(remixer).submit_claim(
            args=["0", "https://youtube.com/remix", "Valid declaration here", 15000]
        ).transact(value=CLAIM_DEPOSIT_MIN)
    assert "proposed_split_bps out of range" in str(exc_info.value)


def test_adjudicate_non_existent_claim(gl):
    contract = gl.deploy("contracts/clearance.py")
    with pytest.raises(Exception) as exc_info:
        contract.adjudicate(args=["999"]).transact()
    assert "claim 999 not found" in str(exc_info.value)


def test_adjudicate_twice(gl):
    artist = gl.accounts[0]
    remixer = gl.accounts[1]
    contract = gl.deploy("contracts/clearance.py")

    contract.connect(artist).register_work(
        args=["Track A", "https://soundcloud.com/a", "License terms text"]
    ).transact()

    contract.connect(remixer).submit_claim(
        args=["0", "https://youtube.com/a", "Declaration details here", 1000]
    ).transact(value=CLAIM_DEPOSIT_MIN)

    gl.sim_installMocks({
        "web.render": "Sample info",
        "exec_prompt": {
            "verdict": "APPROVED",
            "final_split_bps": 1000,
            "reason": "Approved"
        }
    })
    contract.adjudicate(args=["0"]).transact()

    # Second adjudication must fail
    with pytest.raises(Exception) as exc_info:
        contract.adjudicate(args=["0"]).transact()
    assert "already adjudicated" in str(exc_info.value)


def test_distribute_before_adjudication(gl):
    artist = gl.accounts[0]
    remixer = gl.accounts[1]
    contract = gl.deploy("contracts/clearance.py")

    contract.connect(artist).register_work(
        args=["Track B", "https://soundcloud.com/b", "License terms text"]
    ).transact()

    contract.connect(remixer).submit_claim(
        args=["0", "https://youtube.com/b", "Declaration details here", 1000]
    ).transact(value=CLAIM_DEPOSIT_MIN)

    with pytest.raises(Exception) as exc_info:
        contract.connect(remixer).distribute(args=["0"]).transact(value=10_000)
    assert "nothing to distribute" in str(exc_info.value)


def test_adjudicate_rejected(gl):
    artist = gl.accounts[0]
    remixer = gl.accounts[1]
    contract = gl.deploy("contracts/clearance.py")

    contract.connect(artist).register_work(
        args=["Track C", "https://soundcloud.com/c", "No commercial ads for alcohol allowed."]
    ).transact()

    contract.connect(remixer).submit_claim(
        args=["0", "https://youtube.com/c", "Remix used in beer commercial", 1000]
    ).transact(value=CLAIM_DEPOSIT_MIN)

    gl.sim_installMocks({
        "web.render": "Beer commercial background music",
        "exec_prompt": {
            "verdict": "REJECTED",
            "final_split_bps": 0,
            "reason": "Use case violates license terms prohibiting alcohol advertisements."
        }
    })
    contract.adjudicate(args=["0"]).transact()

    claim_data = contract.get_claim(args=["0"]).call()
    assert claim_data["status"] == "REJECTED"
    assert claim_data["final_split_bps"] == 0

    with pytest.raises(Exception) as exc_info:
        contract.distribute(args=["0"]).transact(value=1000)
    assert "nothing to distribute" in str(exc_info.value)
