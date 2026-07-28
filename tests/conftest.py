import pytest

# Fixture setup for genlayer testing environment if required by gltest framework
@pytest.fixture(scope="session")
def network_name():
    return "studionet"
