#!/usr/bin/env bash
# Komprimerar en originalfilm till webbanpassade filer för startsidans hero.
#
# Användning:
#   scripts/encode-hero-video.sh <originalfilm> [max-sekunder]
#
# Skapar:
#   assets/video/hero-1080.mp4  – datorer (1080p)
#   assets/video/hero-720.mp4   – mobiler och surfplattor (720p)
#   assets/img/hero.jpg         – stillbild som visas direkt och om filmen inte spelas
#
# Kräver ffmpeg. Lägg ALDRIG originalfilen i git-repot – den gör repot stort för alltid.
set -euo pipefail

in="${1:?Ange sökväg till originalfilmen}"
max="${2:-}"
root="$(cd "$(dirname "$0")/.." && pwd)"
mkdir -p "$root/assets/video" "$root/assets/img"

trim=()
[ -n "$max" ] && trim=(-t "$max")

common=(-c:v libx264 -preset slow -profile:v high -pix_fmt yuv420p
        -movflags +faststart -c:a aac -ac 2 -map 0:v:0 -map 0:a:0?)

echo "→ 1080p"
ffmpeg -hide_banner -loglevel error -y -i "$in" "${trim[@]}" \
  -vf "scale=-2:'min(1080,ih)':flags=lanczos,fps=30" -crf 27 -maxrate 3M -bufsize 6M -b:a 96k \
  "${common[@]}" "$root/assets/video/hero-1080.mp4"

echo "→ 720p"
ffmpeg -hide_banner -loglevel error -y -i "$in" "${trim[@]}" \
  -vf "scale=-2:'min(720,ih)':flags=lanczos,fps=30" -crf 29 -maxrate 1.5M -bufsize 3M -b:a 64k \
  "${common[@]}" "$root/assets/video/hero-720.mp4"

echo "→ stillbild"
ffmpeg -hide_banner -loglevel error -y -ss 1 -i "$in" -frames:v 1 \
  -vf "scale=-2:'min(1080,ih)':flags=lanczos" -q:v 4 "$root/assets/img/hero.jpg"

ls -lh "$root/assets/video/hero-1080.mp4" "$root/assets/video/hero-720.mp4" "$root/assets/img/hero.jpg"
