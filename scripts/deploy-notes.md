# Manual Contract Deployment Instructions (GenLayer Studionet)

Follow these steps to deploy the `clearance.py` contract to GenLayer **studionet**:

1. Open your browser and navigate to [https://studio.genlayer.com/run-debug](https://studio.genlayer.com/run-debug).
2. Ensure your browser extension (e.g. MetaMask) is connected to **GenLayer Studio Network** (studionet).
   - RPC URL: `https://studio.genlayer.com/api`
   - Chain ID: `61999` (`0xF1EF`)
   - Currency Symbol: `GEN`
3. Click **Reset Storage** / **Hard Refresh** if needed to ensure a clean state.
4. Copy the complete code from `contracts/clearance.py` in this repository.
5. Paste the code into the Studio Code Editor.
6. Click **Deploy**.
7. Confirm the transaction in MetaMask when prompted.
8. Wait for the transaction to complete. Click on the transaction details and verify:
   - **Result: SUCCESS** (ensure it says SUCCESS, not just Status: FINALIZED).
9. Copy the deployed **Contract Address** (formatted as `0x...`) and the **Transaction Hash**.
10. Reply back to Antigravity in the chat with the contract address and transaction hash!
