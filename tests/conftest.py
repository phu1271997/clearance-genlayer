"""
Pytest configuration for the Clearance test suite.

The suite runs on gltest's **direct** runner (`direct_vm` / `direct_deploy`),
which executes the contract natively in Python against an in-memory VM. That
means `pytest tests/` works with no simulator, no studionet connection and no
LLM key — the jury's answers come from `vm.mock_llm` / `vm.mock_web`.

`network_name` is still declared so the same files can be pointed at a live
network later without editing every test.
"""

import pytest

# `gltest.direct.pytest_plugin` registers itself through the genlayer-test
# entry point — listing it in `pytest_plugins` again raises
# "Plugin already registered under a different name".


@pytest.fixture(scope="session")
def network_name():
    return "studionet"
