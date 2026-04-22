#!/bin/bash
# ============================================================
# install-deps.sh — Download & install Razorpay + Stripe SDKs
#                    and all transitive dependencies to .m2
#
# Usage:
#   chmod +x install-deps.sh
#   ./install-deps.sh
# ============================================================

REPO="https://repo1.maven.org/maven2"
TMP_DIR=$(mktemp -d)
FAILED=0
INSTALLED=0

echo "📦 Downloading dependencies to $TMP_DIR"
echo ""

install_jar() {
  local group_path="$1"
  local artifact="$2"
  local version="$3"
  local group_id="${group_path//\//.}"
  local url="$REPO/$group_path/$artifact/$version/$artifact-$version.jar"
  local pom_url="$REPO/$group_path/$artifact/$version/$artifact-$version.pom"
  local jar_file="$TMP_DIR/$artifact-$version.jar"
  local pom_file="$TMP_DIR/$artifact-$version.pom"

  printf "  %-50s" "$group_id:$artifact:$version"

  if curl -sL -f -o "$jar_file" "$url" 2>/dev/null; then
    curl -sL -f -o "$pom_file" "$pom_url" 2>/dev/null || true

    if [ -f "$pom_file" ] && [ -s "$pom_file" ]; then
      if mvn -q install:install-file \
        -Dfile="$jar_file" \
        -DgroupId="$group_id" \
        -DartifactId="$artifact" \
        -Dversion="$version" \
        -Dpackaging=jar \
        -DpomFile="$pom_file" 2>/dev/null; then
        echo "✓"
        INSTALLED=$((INSTALLED+1))
        return
      fi
    fi

    if mvn -q install:install-file \
      -Dfile="$jar_file" \
      -DgroupId="$group_id" \
      -DartifactId="$artifact" \
      -Dversion="$version" \
      -Dpackaging=jar 2>/dev/null; then
      echo "✓"
      INSTALLED=$((INSTALLED+1))
      return
    fi

    echo "✗ (install failed)"
    FAILED=$((FAILED+1))
  else
    echo "✗ (download failed)"
    FAILED=$((FAILED+1))
  fi
}

echo "── Razorpay SDK + transitive deps ──"
install_jar "com/razorpay"              "razorpay-java"         "1.4.6"
install_jar "org/json"                  "json"                  "20180130"
install_jar "com/squareup/okhttp3"      "okhttp"                "4.12.0"
install_jar "com/squareup/okio"         "okio"                  "3.6.0"
install_jar "com/squareup/okio"         "okio-jvm"              "3.6.0"
install_jar "org/jetbrains/kotlin"      "kotlin-stdlib"         "1.9.20"
install_jar "org/jetbrains/kotlin"      "kotlin-stdlib-jdk7"    "1.9.20"
install_jar "org/jetbrains/kotlin"      "kotlin-stdlib-jdk8"    "1.9.20"
install_jar "org/jetbrains"             "annotations"           "13.0"
install_jar "commons-validator"         "commons-validator"     "1.7"
install_jar "commons-beanutils"         "commons-beanutils"     "1.9.4"
install_jar "commons-logging"           "commons-logging"       "1.2"
install_jar "commons-collections"       "commons-collections"   "3.2.2"
install_jar "commons-digester"          "commons-digester"      "2.1"

echo ""
echo "── Stripe SDK + transitive deps ──"
install_jar "com/stripe"                "stripe-java"           "24.18.0"
install_jar "com/google/code/gson"      "gson"                  "2.10.1"

echo ""
rm -rf "$TMP_DIR"

echo "Done: $INSTALLED installed, $FAILED failed"
if [ "$FAILED" -eq 0 ]; then
  echo "🎉 All dependencies installed. Run: cd backend && ./services.sh"
else
  echo "⚠️  Some dependencies failed. Check network and retry."
fi