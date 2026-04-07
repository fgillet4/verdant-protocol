#!/bin/bash
# generate_codebase.sh — concatenates all source files into codebase.md
# Run before an AI session: ./generate_codebase.sh
# Output is gitignored; regenerate any time.

OUTPUT="codebase.md"
ROOT="$(cd "$(dirname "$0")" && pwd)"

echo "# Verdant Protocol — Full Codebase" > "$OUTPUT"
echo "" >> "$OUTPUT"
echo "Generated: $(date)" >> "$OUTPUT"
echo "" >> "$OUTPUT"

# ── Project tree ──────────────────────────────────────────────────────────────
echo "## Directory Structure" >> "$OUTPUT"
echo "" >> "$OUTPUT"
echo '```' >> "$OUTPUT"
find "$ROOT/src" -name "*.js" | sort | sed "s|$ROOT/||" >> "$OUTPUT"
echo '```' >> "$OUTPUT"
echo "" >> "$OUTPUT"

# ── Source files ──────────────────────────────────────────────────────────────
# Order: entry → engine → pathfinding → player → world → inventory → combat →
#        enemies → skills → attunement → ui → utils

FILES=(
  # Entry point
  src/main.js

  # Engine
  src/engine/Engine.js
  src/engine/ClickRaycaster.js
  src/engine/GameLoop.js
  src/engine/AssetLoader.js

  # Pathfinding
  src/pathfinding/Navmesh.js
  src/pathfinding/AStar.js
  src/pathfinding/Funnel.js
  src/pathfinding/PathFollower.js

  # Player
  src/player/Player.js

  # World
  src/world/World.js
  src/world/BiomeState.js

  # Inventory
  src/inventory/ItemDefs.js
  src/inventory/LootTable.js
  src/inventory/Inventory.js
  src/inventory/Equipment.js

  # Combat
  src/combat/DamageCalc.js
  src/combat/CombatManager.js
  src/combat/Abilities.js

  # Enemies
  src/enemies/DroneMesh.js
  src/enemies/DroneEnemy.js
  src/enemies/EnemyManager.js

  # Skills
  src/skills/SkillRegistry.js
  src/skills/XPSystem.js

  # Attunement
  src/attunement/Attunements.js
  src/attunement/AttunementSystem.js

  # UI
  src/ui/HUD.js
  src/ui/DamageNumbers.js
  src/ui/LootLog.js
  src/ui/SkillPanelUI.js
  src/ui/InventoryPanel.js
  src/ui/CellRenderer.js
  src/ui/EquipGrid.js
  src/ui/BagGrid.js
  src/ui/ItemTooltip.js
  src/ui/AttunementBar.js

  # Utils
  src/utils/EventBus.js
  src/utils/MinHeap.js

  # HTML
  index.html
)

for FILE in "${FILES[@]}"; do
  FULL="$ROOT/$FILE"
  if [ ! -f "$FULL" ]; then
    echo "# $FILE (MISSING)" >> "$OUTPUT"
    echo "" >> "$OUTPUT"
    continue
  fi

  EXT="${FILE##*.}"
  LANG="$EXT"
  [ "$EXT" = "html" ] && LANG="html"

  echo "# $FILE" >> "$OUTPUT"
  echo "" >> "$OUTPUT"
  echo "\`\`\`$LANG" >> "$OUTPUT"
  cat "$FULL" >> "$OUTPUT"
  echo "\`\`\`" >> "$OUTPUT"
  echo "" >> "$OUTPUT"
done

LINES=$(wc -l < "$OUTPUT")
echo "Done — $OUTPUT ($LINES lines)"
