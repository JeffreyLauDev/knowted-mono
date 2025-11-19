#!/bin/bash

# install-mise.sh - Install mise (formerly rtx) if not already installed
# mise is a tool version manager that makes it easy to install and manage tools

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Checking if mise is already installed...${NC}"

# Check if mise is already installed
if command -v mise &> /dev/null; then
    echo -e "${GREEN}mise is already installed at $(which mise)${NC}"
    mise --version
    exit 0
fi

echo -e "${YELLOW}mise is not installed. Installing now...${NC}"

# Detect OS
OS="$(uname -s)"
ARCH="$(uname -m)"

case "$OS" in
    Linux*)
        if command -v curl &> /dev/null; then
            curl https://mise.run | sh
        elif command -v wget &> /dev/null; then
            wget -qO- https://mise.run | sh
        else
            echo -e "${RED}Error: curl or wget is required to install mise${NC}"
            exit 1
        fi
        ;;
    Darwin*)
        # macOS
        if command -v brew &> /dev/null; then
            echo -e "${GREEN}Installing mise via Homebrew...${NC}"
            brew install mise
        elif command -v curl &> /dev/null; then
            curl https://mise.run | sh
        elif command -v wget &> /dev/null; then
            wget -qO- https://mise.run | sh
        else
            echo -e "${RED}Error: Homebrew, curl, or wget is required to install mise${NC}"
            exit 1
        fi
        ;;
    *)
        echo -e "${RED}Error: Unsupported operating system: $OS${NC}"
        echo -e "${YELLOW}Please install mise manually from https://mise.run${NC}"
        exit 1
        ;;
esac

# Add mise to PATH if the installation script added it
if [ -f "$HOME/.mise/bin/mise" ]; then
    export PATH="$HOME/.mise/bin:$PATH"
    echo -e "${GREEN}mise installed successfully!${NC}"
    echo -e "${YELLOW}Please add the following to your shell config (~/.zshrc or ~/.bashrc):${NC}"
    echo -e "${GREEN}export PATH=\"\$HOME/.mise/bin:\$PATH\"${NC}"
    echo -e "${YELLOW}Then run: source ~/.zshrc (or ~/.bashrc)${NC}"
elif command -v mise &> /dev/null; then
    echo -e "${GREEN}mise installed successfully!${NC}"
    mise --version
else
    echo -e "${RED}Error: mise installation may have failed. Please check the output above.${NC}"
    exit 1
fi












