#!/usr/bin/env bash

# Location to save FoundryVTT app default="/opt/foundryvtt"
FOUNDRY_APP_DIR="/opt/foundryvtt"
# Location to save FoundryVTT assets/modules/systems default="/opt/foundrydata"
FOUNDRY_DATA_DIR="/opt/foundrydata"
# Port number for FoundryVTT default="30000" increment by 1 for additional instances
FOUNDRY_PORT="30000"


echo $FOUNDRY_URL
# If foundry url is not set, ask for it
if [ -z "$FOUNDRY_URL" ]; then
  echo "Enter the URL to download FoundryVTT from:"
  read -r FOUNDRY_URL
fi

# Install Foundry
mkdir -p "$FOUNDRY_APP_DIR" "$FOUNDRY_DATA_DIR"
wget -O "$FOUNDRY_APP_DIR/foundryvtt.zip" "$FOUNDRY_URL"
unzip "$FOUNDRY_APP_DIR/foundryvtt.zip" -d "$FOUNDRY_APP_DIR"


# Give Foundry time to generate the options.json file
echo "Initializing FoundryVTT..."
timeout 10 node $FOUNDRY_APP_DIR/resources/app/main.js


# Create Foundry Data directories
mkdir -p "$FOUNDRY_DATA_DIR/Config" "$FOUNDRY_DATA_DIR/Data" "$FOUNDRY_DATA_DIR/Logs"
mkdir -p "$FOUNDRY_DATA_DIR/Data/systems"

# Configure Foundry for HTTPS proxying
cat > "$FOUNDRY_DATA_DIR/Config/options.json" <<EOF
{
  "dataPath": "${FOUNDRY_DATA_DIR}",
  "compressStatic": true,
  "fullscreen": false,
  "hostname": "",
  "language": "en.core",
  "localHostname": null,
  "port": $FOUNDRY_PORT,
  "protocol": null,
  "proxyPort": null,
  "proxySSL": false,
  "routePrefix": null,
  "updateChannel": "stable",
  "upnp": true,
  "upnpLeaseDuration": null,
  "awsConfig": null,
  "passwordSalt": null,
  "sslCert": null,
  "sslKey": null,
  "world": null,
  "serviceConfig": null
}
EOF

ln -s /workspaces/D35E $FOUNDRY_DATA_DIR/Data/systems/

