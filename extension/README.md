# SnapCode VS Code Extension

The SnapCode extension provides a VS Code Activity Bar icon, a SnapCode sidebar, and the `SnapCode: Open` command. Paste a code screenshot into the sidebar, click `Extract Code`, and review or copy the returned code there.

The extension sends the pasted image from the Extension Host to the deployed backend at `https://snapcode-5z40.onrender.com/api/extract` as a multipart upload using the `image` field. It does not contain or access the backend's Groq credentials, and this stage does not insert code into the active editor.

## Run in VS Code

1. Open the `extension/` folder in VS Code.
2. Press `F5` to launch an Extension Development Host.
3. Click the SnapCode icon in the Activity Bar.
4. Run `SnapCode: Open` from the Command Palette.
5. The deployed SnapCode backend is available at `https://snapcode-5z40.onrender.com`.
6. Paste an image, click `Extract Code`, and use `Copy Code` for the result.
