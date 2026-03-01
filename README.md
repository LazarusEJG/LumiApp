# LumiApp — Local, Offline LLM Desktop Application

LumiApp is a fully standalone desktop application that runs large language models locally using the llama-server backend from llama.cpp. It bundles all required runtime components, including CPU backend plugins, so it can run on any Windows machine without additional installs or dependencies.

The goal of LumiApp is to provide a clean, simple, offline chat interface powered entirely by local inference. No cloud calls, no telemetry, no setup beyond dropping in a .gguf model.

# Features

Fully local inference using llama.cpp’s llama-server

Portable backend with all required DLLs and CPU backend plugins included

Electron-based UI with a clean, scrollable chat interface

Zero external dependencies on the target machine

Drop‑in model loading — place any .gguf file in the backend folder

Fast startup and optimized CPU execution on modern hardware

Works on clean Windows systems with no additional installs

# How LumiApp Works

LumiApp uses a simple, robust architecture:

The Electron main process launches llama-server.exe from the bundled backend folder.

The backend exposes an OpenAI‑style HTTP API on localhost.

The renderer process streams responses into the chat UI.

All compute is handled by llama.cpp’s CPU backend plugins, which are included in the release.

Users can swap models by replacing the .gguf file in resources/backend.

This design keeps the app portable, predictable, and easy to maintain.

# Installation & Usage

Download the latest release ZIP from GitHub.

Extract the folder.

Place your .gguf model file into:

resources/backend/
Run lumiapplication.exe.

LumiApp will automatically start the backend and begin responding in real time.

# Backend Folder Structure

A complete backend folder includes:

resources/backend/
  llama-server.exe
  llama.dll
  ggml.dll
  ggml-base.dll
  ggml-cpu-*.dll        (CPU backend plugins)
  ggml-rpc.dll
  libomp140.x86_64.dll
  your-model.gguf       (user-provided)

These files ensure llama.cpp can initialize the correct compute backend on any CPU architecture.

# Releases

# v1.0.2

Added full set of CPU backend plugin DLLs for complete portability

Verified working on clean Windows systems with no external dependencies

# v1.0.1

Added missing core DLLs required for backend startup

# v1.0.0
First fully functional standalone release

Packaged Electron app + llama.cpp backend

Basic streaming chat interface

# License

LumiApp is released under the MIT License, which allows anyone to use, modify, and distribute the project while protecting the author from liability.

# Credits
Created by EJ Gordon, with architectural and debugging support from Copilot.