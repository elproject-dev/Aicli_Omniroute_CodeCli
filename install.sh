#!/usr/bin/env bash
set -e

# Warna output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

TARGET_DIR="${1:-ai-cli}"

echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}⚡ AICLI — AI Chat CLI & Code Agent ⚡${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

echo -e "${YELLOW}📁 Menyiapkan instalasi di folder terisolasi: '${TARGET_DIR}'...${NC}"

# 1. Buat folder khusus ai-cli jika belum ada
if [ ! -d "$TARGET_DIR" ]; then
  mkdir -p "$TARGET_DIR"
  echo -e "${GREEN}✓ Folder '${TARGET_DIR}' berhasil dibuat.${NC}"
else
  echo -e "${YELLOW}ℹ Folder '${TARGET_DIR}' sudah ada, menggunakan folder tersebut.${NC}"
fi

# 2. Masuk ke folder ai-cli
cd "$TARGET_DIR"

# 3. Instalasi paket secara lokal di dalam folder ai-cli (tidak berantakan ke luar)
echo -e "${YELLOW}📦 Menginstal paket aicli-omniroute di dalam folder '${TARGET_DIR}'...${NC}"

# Jika di dalam repositori source code
if [ -f "../package.json" ] && [ -d "../src" ]; then
  echo -e "${BLUE}ℹ Terdeteksi dalam repositori lokal, melakukan link...${NC}"
  cd ..
  npm run build
  npm link
else
  # Instalasi via npm di dalam folder khusus
  if [ ! -f "package.json" ]; then
    npm init -y --silent > /dev/null 2>&1 || true
  fi
  npm install aicli-omniroute --silent
fi

# 4. Memastikan symlink global tersedia di ~/.local/bin atau ~/.npm-global/bin
BIN_DIR="$HOME/.local/bin"
mkdir -p "$BIN_DIR"

# Cari lokasi index.js
SOURCE_BIN=""
if [ -f "../dist/index.js" ]; then
  SOURCE_BIN="$(cd .. && pwd)/dist/index.js"
elif [ -f "./node_modules/aicli-omniroute/dist/index.js" ]; then
  SOURCE_BIN="$(pwd)/node_modules/aicli-omniroute/dist/index.js"
elif [ -f "./dist/index.js" ]; then
  SOURCE_BIN="$(pwd)/dist/index.js"
fi

if [ -n "$SOURCE_BIN" ] && [ -f "$SOURCE_BIN" ]; then
  chmod +x "$SOURCE_BIN"
  ln -sf "$SOURCE_BIN" "$BIN_DIR/aicli"
  ln -sf "$SOURCE_BIN" "$BIN_DIR/aicli-omniroute"
  echo -e "${GREEN}✓ Shortcut global berhasil dibuat di ${BIN_DIR}/aicli dan aicli-omniroute${NC}"
fi

echo ""
echo -e "${GREEN}🎉 Instalasi selesai! Semua berkas tersimpan rapi di dalam folder '${TARGET_DIR}'.${NC}"
echo -e "${BLUE}Anda dapat menjalankan CLI dari mana saja dengan perintah:${NC}"
echo -e "  ${GREEN}aicli${NC}"
echo -e "  ${GREEN}aicli-omniroute${NC}"
echo ""
