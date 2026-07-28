# v0.2.16
# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
from genlayer import *
from dataclasses import dataclass
import json
import typing


# --- Storage structs -----------------------------------------------------------

@allow_storage
@dataclass
class Work:
    id: str
    artist: str            # hex address string
    title: str
    source_url: str
    license_terms: str     # natural language, free-form
    created_at: bigint

@allow_storage
@dataclass
class Claim:
    id: str
    work_id: str
    remixer: str
    remix_url: str
    declaration: str
    proposed_split_bps: u16    # 0-10000 (100.00%)
    status: str                # "PENDING" | "APPROVED" | "MODIFIED" | "REJECTED" | "ERROR"
    final_split_bps: u16
    reason: str
    deposit: bigint
    distributed: bool


# --- Helpers ------------------------------------------------------------------

def _addr_str(addr: Address) -> str:
    try:
        return addr.as_hex
    except Exception:
        return str(addr)


CLAIM_DEPOSIT_MIN = bigint(10_000_000_000_000_000)   # 0.01 GEN in wei (18 decimals)


# --- Contract -----------------------------------------------------------------

class Contract(gl.Contract):
    # Storage (TreeMap / DynArray auto-initialize — DO NOT reassign in __init__)
    works: TreeMap[str, Work]
    claims: TreeMap[str, Claim]
    claims_by_work: TreeMap[str, DynArray[str]]     # work_id -> [claim_id, ...]
    works_by_artist: TreeMap[str, DynArray[str]]    # artist -> [work_id, ...]
    next_work_id: bigint
    next_claim_id: bigint
    owner: Address

    def __init__(self):
        self.next_work_id = bigint(0)
        self.next_claim_id = bigint(0)
        self.owner = gl.message.sender_address
        # DO NOT touch works / claims / claims_by_work / works_by_artist here.

    # -- WRITE: register a work ------------------------------------------------

    @gl.public.write
    def register_work(self, title: str, source_url: str, license_terms: str) -> str:
        if not title.strip():
            raise UserError("title is empty")
        if not source_url.startswith("http"):
            raise UserError("source_url must be an http(s) URL")
        if len(license_terms.strip()) < 10:
            raise UserError("license_terms too short — describe the actual license")
        if len(license_terms) > 4000:
            raise UserError("license_terms too long (max 4000 chars)")

        artist = _addr_str(gl.message.sender_address)
        wid = str(self.next_work_id)
        self.next_work_id = self.next_work_id + bigint(1)

        self.works[wid] = Work(
            id=wid,
            artist=artist,
            title=title,
            source_url=source_url,
            license_terms=license_terms,
            created_at=bigint(gl.message.block_timestamp) if hasattr(gl.message, "block_timestamp") else bigint(0),
        )
        # Ensure the artist bucket exists, then append.
        if artist not in self.works_by_artist:
            self.works_by_artist[artist] = gl.storage.inmem_allocate(DynArray[str])
        self.works_by_artist[artist].append(wid)
        return wid

    # -- WRITE (payable): submit a remix claim ---------------------------------

    @gl.public.write.payable
    def submit_claim(
        self,
        work_id: str,
        remix_url: str,
        declaration: str,
        proposed_split_bps: int,
    ) -> str:
        if work_id not in self.works:
            raise UserError(f"work_id {work_id} not found")
        if not remix_url.startswith("http"):
            raise UserError("remix_url must be an http(s) URL")
        if len(declaration.strip()) < 10:
            raise UserError("declaration too short")
        if len(declaration) > 4000:
            raise UserError("declaration too long (max 4000 chars)")
        if proposed_split_bps < 0 or proposed_split_bps > 10000:
            raise UserError("proposed_split_bps out of range [0, 10000]")
        if gl.message.value < CLAIM_DEPOSIT_MIN:
            raise UserError("insufficient deposit (min 0.01 GEN)")

        remixer = _addr_str(gl.message.sender_address)
        cid = str(self.next_claim_id)
        self.next_claim_id = self.next_claim_id + bigint(1)

        self.claims[cid] = Claim(
            id=cid,
            work_id=work_id,
            remixer=remixer,
            remix_url=remix_url,
            declaration=declaration,
            proposed_split_bps=u16(proposed_split_bps),
            status="PENDING",
            final_split_bps=u16(0),
            reason="",
            deposit=bigint(gl.message.value),
            distributed=False,
        )
        if work_id not in self.claims_by_work:
            self.claims_by_work[work_id] = gl.storage.inmem_allocate(DynArray[str])
        self.claims_by_work[work_id].append(cid)
        return cid

    # -- WRITE: adjudicate (the heart of the contract) -------------------------

    @gl.public.write
    def adjudicate(self, claim_id: str) -> None:
        if claim_id not in self.claims:
            raise UserError(f"claim {claim_id} not found")
        c = self.claims[claim_id]
        if c.status != "PENDING":
            raise UserError(f"claim {claim_id} already adjudicated: {c.status}")
        if c.work_id not in self.works:
            raise UserError(f"work {c.work_id} vanished")
        w = self.works[c.work_id]

        # Capture into local variables — nondet blocks cannot read self.*
        remix_url = c.remix_url
        source_url = w.source_url
        declaration = c.declaration
        proposed_split = int(c.proposed_split_bps)
        license_terms = w.license_terms
        original_title = w.title

        def leader_fn():
            # Fetch remix page — main evidence
            try:
                remix_meta = gl.nondet.web.render(remix_url, mode="text")
            except Exception as e:
                return {
                    "verdict": "ERROR",
                    "final_split_bps": 0,
                    "reason": f"Could not fetch remix URL: {str(e)[:200]}",
                }
            # Fetch original — cross-reference (optional, tolerate failure)
            try:
                original_meta = gl.nondet.web.render(source_url, mode="text")
            except Exception:
                original_meta = "(original page unavailable — proceed with terms only)"

            # Trim to keep prompt bounded
            remix_meta = remix_meta[:2500] if remix_meta else "(empty)"
            original_meta = original_meta[:1500] if original_meta else "(empty)"

            prompt = f"""You are an impartial music-clearance adjudicator on a decentralized network of AI validators.

## ORIGINAL WORK
- Title: {original_title}
- Source: {source_url}
- Public page snippet:
{original_meta}

## LICENSE TERMS (set by the original artist, natural language)
{license_terms}

## REMIX CLAIM
- Remix URL: {remix_url}
- Public page snippet:
{remix_meta}
- Remixer's declaration about how the sample is used:
{declaration}
- Proposed royalty split to the original artist: {proposed_split} basis points ({proposed_split / 100:.2f}%)

## YOUR TASK
Judge whether the remix complies with the license terms, using BOTH the declaration and the public page evidence. Detect obvious contradictions between what the remixer declares and what the page shows.

Reply with ONLY a JSON object, no markdown fences, no prose:
{{
  "verdict": "APPROVED" | "MODIFIED" | "REJECTED",
  "final_split_bps": <integer 0-10000>,
  "reason": "<one paragraph citing specific terms and evidence>"
}}

Decision guide:
- APPROVED: declaration is consistent with the page evidence AND the proposed split satisfies the terms.
- MODIFIED: declaration is consistent BUT the proposed split violates the terms → set final_split_bps to what the terms require.
- REJECTED: declaration contradicts evidence, OR the use case violates terms (e.g., prohibited context), OR strong signals of undeclared sampling.
"""
            return gl.nondet.exec_prompt(prompt, response_format="json")

        def validator_fn(leader_res: typing.Any) -> bool:
            # Guard against leader errors / rollback
            if not isinstance(leader_res, gl.vm.Return):
                return False
            leader = leader_res.calldata
            if not isinstance(leader, dict) or "verdict" not in leader:
                return False

            # Re-run locally and compare MEANING (verdict), not wording
            try:
                mine = leader_fn()
            except Exception:
                return False
            if not isinstance(mine, dict) or "verdict" not in mine:
                return False

            if mine["verdict"] != leader["verdict"]:
                return False

            # For MODIFIED, require final_split_bps within ±500 bps (±5%)
            if leader["verdict"] == "MODIFIED":
                try:
                    ls = int(leader.get("final_split_bps", -1))
                    ms = int(mine.get("final_split_bps", -1))
                except (TypeError, ValueError):
                    return False
                if ls < 0 or ls > 10000 or ms < 0 or ms > 10000:
                    return False
                if abs(ls - ms) > 500:
                    return False

            return True

        result = gl.vm.run_nondet(leader_fn, validator_fn)

        verdict = result.get("verdict", "ERROR") if isinstance(result, dict) else "ERROR"
        reason = result.get("reason", "") if isinstance(result, dict) else "no result"

        if verdict == "ERROR":
            c.reason = reason[:1000]
            # Leave status PENDING so remixer can retry after fixing URL.
            self.claims[claim_id] = c
            return

        c.status = verdict
        c.reason = reason[:1000]
        if verdict == "APPROVED":
            c.final_split_bps = u16(int(c.proposed_split_bps))
        elif verdict == "MODIFIED":
            try:
                fs = int(result.get("final_split_bps", 0))
            except (TypeError, ValueError):
                fs = 0
            fs = max(0, min(10000, fs))
            c.final_split_bps = u16(fs)
        else:  # REJECTED
            c.final_split_bps = u16(0)

        self.claims[claim_id] = c

    # -- WRITE (payable): distribute royalty for an approved/modified claim ----

    @gl.public.write.payable
    def distribute(self, claim_id: str) -> None:
        if claim_id not in self.claims:
            raise UserError(f"claim {claim_id} not found")
        c = self.claims[claim_id]
        if c.distributed:
            raise UserError("already distributed")
        if c.status not in ("APPROVED", "MODIFIED"):
            raise UserError(f"claim is {c.status} — nothing to distribute")
        if c.work_id not in self.works:
            raise UserError("work vanished")
        w = self.works[c.work_id]
        if gl.message.value <= 0:
            raise UserError("send some GEN to distribute")

        total = bigint(gl.message.value)
        split_bps = int(c.final_split_bps)
        to_artist = (total * bigint(split_bps)) // bigint(10000)
        to_remixer = total - to_artist

        # Refund deposit too — approval means good-faith
        to_remixer_total = to_remixer + c.deposit

        artist_addr = Address(w.artist)
        remixer_addr = Address(c.remixer)

        if to_artist > 0:
            gl.get_contract_at(artist_addr).emit_transfer(value=u256(int(to_artist)))
        if to_remixer_total > 0:
            gl.get_contract_at(remixer_addr).emit_transfer(value=u256(int(to_remixer_total)))

        c.distributed = True
        c.deposit = bigint(0)
        self.claims[claim_id] = c

    # -- READ views ------------------------------------------------------------

    @gl.public.view
    def get_work(self, work_id: str) -> dict:
        if work_id not in self.works:
            raise UserError("not found")
        w = self.works[work_id]
        return {
            "id": w.id,
            "artist": w.artist,
            "title": w.title,
            "source_url": w.source_url,
            "license_terms": w.license_terms,
            "created_at": int(w.created_at),
        }

    @gl.public.view
    def get_claim(self, claim_id: str) -> dict:
        if claim_id not in self.claims:
            raise UserError("not found")
        c = self.claims[claim_id]
        return {
            "id": c.id,
            "work_id": c.work_id,
            "remixer": c.remixer,
            "remix_url": c.remix_url,
            "declaration": c.declaration,
            "proposed_split_bps": int(c.proposed_split_bps),
            "final_split_bps": int(c.final_split_bps),
            "status": c.status,
            "reason": c.reason,
            "deposit": str(int(c.deposit)),
            "distributed": c.distributed,
        }

    @gl.public.view
    def list_works(self) -> list:
        out = []
        for wid in self.works:
            w = self.works[wid]
            out.append({"id": w.id, "artist": w.artist, "title": w.title})
        return out

    @gl.public.view
    def list_claims_for_work(self, work_id: str) -> list:
        if work_id not in self.claims_by_work:
            return []
        out = []
        for cid in self.claims_by_work[work_id]:
            c = self.claims[cid]
            out.append({
                "id": c.id,
                "remixer": c.remixer,
                "status": c.status,
                "proposed_split_bps": int(c.proposed_split_bps),
                "final_split_bps": int(c.final_split_bps),
            })
        return out

    @gl.public.view
    def counts(self) -> dict:
        return {
            "works": int(self.next_work_id),
            "claims": int(self.next_claim_id),
        }
