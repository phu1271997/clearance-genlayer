# Clearance — Hội đồng AI on-chain xử lý bản quyền sample nhạc trên GenLayer

> **Một hội đồng AI on-chain phân xử clearance sample nhạc trong vài phút, không phải hàng tháng.**

**Phiên bản hiện tại:** `v1.3.0` — xem [`CHANGELOG.md`](CHANGELOG.md) và [`SECURITY.md`](SECURITY.md).
Bản gốc tiếng Anh: [`README.md`](README.md).

---

## Vấn đề dự án giải quyết

Clearance sample nhạc truyền thống là một hệ thống hỏng. Khi một producer
muốn dùng hợp pháp một đoạn sample 3 giây, họ phải chờ nhiều tháng qua thủ
tục pháp lý, phí duy trì với hãng, hợp đồng viết tay, và những công thức
chia royalty mờ ám. Nghệ sĩ độc lập nhỏ thường bị chặn cửa hoàn toàn hoặc
buộc phải bootleg không tín dụng.

Digital-rights management hiện tại hoặc dựa vào các nền tảng tập trung (có
thể đơn phương gỡ track hoặc thu hồi điều khoản), hoặc dựa vào smart contract
Solidity — vốn deterministic và mù: không phân tích được các điều kiện
licensing bằng ngôn ngữ tự nhiên, không fetch được metadata SoundCloud /
YouTube trực tiếp trên chuỗi.

**Clearance** giải quyết bằng một protocol phi tập trung, không tin cậy:
nghệ sĩ gốc đặt điều khoản licensing bằng tiếng Anh tự do, remixer khai báo
cách dùng sample kèm URL công khai, và **hội đồng AI trên chuỗi** phán xét
tuân thủ + tính chia royalty ràng buộc.

---

## Vì sao chọn GenLayer

- **Điều khoản license bằng ngôn ngữ tự nhiên.** Artist viết tự do
  (*"Sample dưới 4 giây miễn phí. Dài hơn cần 30% split. Không dùng cho
  quảng cáo rượu."*). Contract AI của GenLayer phân tích lại điều khoản này
  cho từng claim.
- **On-chain web scraping.** Validator gọi `gl.nondet.web.render` để render
  metadata trang web trực tiếp trong lúc thực thi contract — không oracle.
- **Đồng thuận AI dung sai.** Validator chạy prompt LLM
  (`gl.nondet.exec_prompt`) rồi đồng thuận về verdict + royalty split qua
  một `validator_fn` tùy biến bên trong `gl.vm.run_nondet` — verdict khớp
  ngữ nghĩa, split lệch ≤ ±5%, confidence lệch ≤ ±20 điểm.
- **Chống prompt-injection.** `CANARY_TOKEN` nhúng trong system prompt;
  validator từ chối nếu leader echo token đó. Input chứa token bị chặn ngay
  ở biên contract.
- **Escrow kinh tế.** Remixer deposit 0.01 GEN mỗi claim. Với
  APPROVED/MODIFIED, deposit hoàn trả qua `distribute()`. Với REJECTED,
  deposit bị forfeit; appeal tốn 2× deposit gốc — định giá theo
  `base_deposit` bất biến để một rejection không làm appeal kế tiếp thành
  miễn phí. Tiền forfeit bị **khóa** khi vẫn còn quyền appeal, chỉ trở
  thành sweepable khi hết appeal. Mô hình đầy đủ ở
  [`ECONOMICS.md`](ECONOMICS.md).

*Bỏ layer AI + web đi thì dự án thành Google Form. Không thể build bằng
smart contract thường.*

---

## Kiến trúc tóm tắt

Chi tiết ở [`ARCHITECTURE.md`](ARCHITECTURE.md). Ngắn gọn:

```
Artist ── register_work() ─┐
                            ├─►  Frontend React + genlayer-js
Remixer ── submit_claim() ──┘        │
                                     ▼
                       adjudicate() / appeal()
                                     │
                                     ▼
              GenLayer Studionet Intelligent Contract
              ├─ leader_fn: gl.nondet.web.render × 2  → gl.nondet.exec_prompt
              └─ validator_fn: so verdict + split ±5% + confidence ±20
                              từ chối nếu canary rò rỉ
                                     │
                                     ▼
                       Ghi state on-chain ── distribute() ──►
                       Artist share + Remixer share + refund deposit
```

---

## Deploy hiện tại

- **Mạng:** GenLayer Studio Network (`studionet`, Chain ID `61999` / `0xF1EF`)
- **Contract v1.2.0:** `0xB9185ccb8D9b6C0667f62B2556596964536a2631` — xem trên
  [explorer-studio.genlayer.com](https://explorer-studio.genlayer.com/address/0xB9185ccb8D9b6C0667f62B2556596964536a2631)
- **Frontend live:** https://clearance-genlayer.vercel.app
- **Verdict feed công khai** (không cần ví):
  https://clearance-genlayer.vercel.app/verdicts
- **Các trang evidence hội đồng đọc:**
  https://clearance-genlayer.vercel.app/evidence/

v1.3.0 nâng cấp frontend + docs, **không** đổi contract, nên **không cần
redeploy**.

---

## Luồng thử nghiệm nhanh

1. Vào [live app](https://clearance-genlayer.vercel.app) — modal onboarding
   sẽ giải thích 6 bước cho lần đầu ghé thăm.
2. Vào `/verdicts` để xem verdict feed public — không cần ví.
3. Kết nối MetaMask (app tự thêm/switch sang studionet).
4. Nạp GEN cho ví từ panel **Accounts** trong Studio (không dùng testnet
   faucet — hai mạng khác nhau).
5. Vào `/register` → chọn preset "Neon Rain" → đăng ký work.
6. Vào work vừa tạo → **Submit Claim** → chọn preset APPROVED / MODIFIED /
   REJECTED → gửi 0.01 GEN.
7. Trong trang claim → bấm **Adjudicate** → chờ 30–90 giây consensus.
8. Với APPROVED/MODIFIED → bấm **Distribute** (≥ 0.10 GEN) để chốt royalty.
9. Với REJECTED → có thể **Appeal** (stake 2× deposit gốc).

---

## Chạy frontend cục bộ

```bash
cd frontend
cp .env.example .env
# Đặt VITE_CONTRACT_ADDRESS=0xB9185ccb8D9b6C0667f62B2556596964536a2631
npm install
npm run dev
```

Mở tại `http://localhost:3000`.

---

## Chạy test

```bash
pip install genlayer-test
pytest tests/
```

**32 tests, ~0.3s, không cần network, không cần LLM key.** Suite chạy trên
gltest direct runner với `vm.mock_llm` / `vm.mock_web` cheatcodes.

---

## Nộp cho Builder Program

Portal: https://portal.genlayer.foundation/#/builders/contributions

Loại contribution: GenLayer App / Intelligent Contract. Xem
[`CHANGELOG.md`](CHANGELOG.md), [`SECURITY.md`](SECURITY.md),
[`ECONOMICS.md`](ECONOMICS.md), [`CONTRIBUTING.md`](CONTRIBUTING.md),
[`docs/adr/`](docs/adr/) và [`docs/ONBOARDING.md`](docs/ONBOARDING.md).

Deploy trên **studionet** qua GenLayer Studio — vì thế listing trên Project
Explorer có status **Preview**, không phải Live.

---

## Ghi chú runtime

- **Pragma:** `# v0.2.16` + `Depends: py-genlayer:1jb45aa8...`.
- **API:** `gl.vm.run_nondet` (có sandbox). Không dùng `run_nondet_unsafe`.
- **Hằng số:** `CLAIM_DEPOSIT_MIN = 0.01 GEN`, `SETTLEMENT_MIN = 0.10 GEN`,
  `APPEAL_STAKE_MULTIPLIER = 2`, `MAX_APPEALS = 2`. Đọc trực tiếp từ chuỗi
  qua `get_config()`.

---

## License

[MIT](LICENSE)
