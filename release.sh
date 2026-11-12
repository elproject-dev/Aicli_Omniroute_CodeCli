#!/usr/bin/env bash
set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

MODE="${1:-all}"
COMMIT_MSG="${2:-chore: update project, skills integration, and README}"

echo -e "${BLUE}================================================${NC}"
echo -e "${GREEN}🚀 AICLI — Update README & Release (GitHub + NPM)${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""

# Pastikan berada di direktori script ini
cd "$(dirname "$0")"

# 1. Build ulang project agar dist/ selalu sinkron
echo -e "${YELLOW}🔨 [1/3] Mengompilasi project (npm run build)...${NC}"
npm run build
echo -e "${GREEN}✓ Build berhasil.${NC}\n"

# 2. Update ke GitHub (jika mode all atau github)
if [ "$MODE" = "all" ] || [ "$MODE" = "github" ]; then
  echo -e "${YELLOW}🐙 [2/3] Menyimpan & mengunggah perubahan ke GitHub...${NC}"
  git add .
  if git diff --cached --quiet; then
    echo -e "${BLUE}ℹ Tidak ada perubahan file baru untuk di-commit.${NC}"
  else
    git commit -m "$COMMIT_MSG"
    echo -e "${GREEN}✓ Commit berhasil dibuat.${NC}"
  fi
  git push origin main
  echo -e "${GREEN}✓ README & kode terbaru berhasil di-push ke GitHub!${NC}\n"
fi

# 3. Update ke NPM (jika mode all atau npm)
if [ "$MODE" = "all" ] || [ "$MODE" = "npm" ]; then
  echo -e "${YELLOW}📦 [3/3] Mempublikasikan README & paket terbaru ke NPM...${NC}"

  # Cek apakah sudah login ke NPM
  if ! npm whoami > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠ Anda belum login ke NPM di terminal ini.${NC}"
    echo -e "${BLUE}Silakan login terlebih dahulu (npm login):${NC}"
    npm login
  fi

  # Cek apakah versi di package.json sudah pernah dipublish di NPM
  LOCAL_VER=$(node -p "require('./package.json').version")
  PUBLISHED_VER=$(npm view aicli-omniroute version 2>/dev/null || echo "0.0.0")

  if [ "$LOCAL_VER" = "$PUBLISHED_VER" ]; then
    echo -e "${YELLOW}ℹ Versi ${LOCAL_VER} sudah ada di NPM. Menaikkan versi patch secara otomatis...${NC}"
    npm version patch --no-git-tag-version
    NEW_VER=$(node -p "require('./package.json').version")
    echo -e "${GREEN}✓ Versi dinaikkan ke ${NEW_VER}.${NC}"
    if [ "$MODE" = "all" ]; then
      git add package.json package-lock.json 2>/dev/null || git add package.json
      git commit -m "chore: bump version to ${NEW_VER}" || true
      git push origin main || true
    fi
  fi

  npm publish --access public
  FINAL_VER=$(node -p "require('./package.json').version")
  echo -e "${GREEN}🎉 Berhasil mempublikasikan aicli-omniroute@${FINAL_VER} beserta README terbaru ke NPM!${NC}\n"
fi

echo -e "${GREEN}✅ Selesai!${NC}"

