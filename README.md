# Real-Time Walkie Talkie Application

This is a simple, web-based walkie-talkie application that demonstrates real-time audio communication between two clients using WebRTC and WebSockets.

## How it Works

- A Node.js server acts as a **Signaling Server** using WebSockets (`ws`). It doesn't process any audio, but it helps two clients find and connect to each other.
- The client-side application uses the **WebRTC** API (`RTCPeerConnection`) to create a direct peer-to-peer connection between the two browsers.
- Audio is captured from the user's microphone using the `getUserMedia` API.
- The "Push to Talk" button enables and disables the audio track on the WebRTC stream, simulating walkie-talkie functionality.

## Prerequisites

- [Node.js](https://nodejs.org/) (which includes `npm`) must be installed on your system.

## Setup and Installation

1.  **Install dependencies:**
    Open your terminal in the project root directory and run:
    ```bash
    npm install
    ```

## Running the Application

1.  **Start the server:**
    In the same terminal, run:
    ```bash
    npm start
    ```
    You should see a message indicating that the server is listening on `http://localhost:8080`.

## How to Test

1.  **Open two browser tabs or windows.**
2.  Navigate to `http://localhost:8080` in both of them.
3.  **Grant microphone permissions** in both tabs when prompted.
4.  Once both tabs are open and have microphone access, they will automatically connect to each other. The status message should change to "Connected to peer!".
5.  **Press and hold** the "Push to Talk" button in one tab. While holding it, speak into your microphone.
6.  You should hear the audio playing in the other tab.
7.  Release the button to stop transmitting. You can then transmit from the other tab.
