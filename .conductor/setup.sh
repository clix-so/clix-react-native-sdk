#!/bin/zsh
set -e

echo "🔧 Conductor workspace setup starting..."
echo ""

# Copy clix_config.json
echo "📝 Copying clix_config.json..."
if [ -f "$CONDUCTOR_ROOT_PATH/samples/BasicApp/src/assets/clix_config.json" ]; then
  mkdir -p samples/BasicApp/src/assets
  cp -f "$CONDUCTOR_ROOT_PATH/samples/BasicApp/src/assets/clix_config.json" "samples/BasicApp/src/assets/clix_config.json"
  echo "  ✓ Copied: samples/BasicApp/src/assets/clix_config.json"
fi

echo ""
echo "✅ Conductor workspace setup complete!"
