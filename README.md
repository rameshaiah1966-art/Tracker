# Device Orientation 3D Visualizer

This web application uses your device's sensors (specifically the accelerometer and gyroscope) to determine its orientation in real-time and displays it using a 3D model in your browser.

## Features

-   **Real-time Orientation Tracking:** Uses the `RelativeOrientationSensor` API to get stable orientation data.
-   **3D Visualization:** Renders a 3D model of a phone-like device that mirrors your physical device's orientation.
-   **Cross-browser Compatibility:** Includes fallback logic to use the raw `Gyroscope` data on browsers that do not support `RelativeOrientationSensor`.
-   **Responsive:** The 3D scene adapts to the window size.

## How to Run

Accessing device sensors from a browser has a strict security requirement: **the page must be served over a secure context (HTTPS).** You cannot simply open the `index.html` file in your browser from the local filesystem.

Here's how to set up a simple local HTTPS server to run this application.

### Prerequisites

-   [Node.js and npm](https://nodejs.org/en/) installed on your computer.
-   [OpenSSL](https://www.openssl.org/) command-line tool installed. (This is pre-installed on macOS and most Linux distributions).

### 1. Generate a Self-Signed SSL Certificate

First, you need to create a key and a certificate file for the local server.

Open your terminal and run the following `openssl` command in the root of this project directory:

```bash
openssl req -x509 -newkey rsa:2048 -keyout key.pem -out cert.pem -days 365 -nodes
```

This command will ask you a series of questions. You can answer them or just press Enter to accept the defaults. This will generate two files: `key.pem` and `cert.pem`.

### 2. Start the HTTPS Server

The easiest way to start a local HTTPS server is by using the `http-server` package, which you can run directly with `npx`.

In your terminal, from the root of the project, run the following command:

```bash
npx http-server --ssl -c-1 -o client/index.html
```

-   `--ssl`: Enables HTTPS. It will automatically look for `key.pem` and `cert.pem` in the current directory.
-   `-c-1`: Disables caching, which is useful for development.
-   `-o client/index.html`: Opens the browser to the correct starting page.

### 3. Access the Application

After running the command, your browser should open to a URL like `https://127.0.0.1:8080/client/index.html`.

You will see a privacy warning from your browser because the SSL certificate is "self-signed" and not trusted by a certificate authority. This is expected and safe for local development. Click "Advanced" and then "Proceed to..." to open the application.

To test the sensor functionality, you need to access this server from a device with sensors, like a smartphone.

1.  Find your computer's local IP address (e.g., `192.168.1.100`).
2.  On your smartphone, ensure you are on the **same Wi-Fi network** as your computer.
3.  Open a browser on your phone and navigate to `https://<your-computer-ip>:8080/client/index.html`.
4.  You will see the same privacy warning. Accept it to proceed.
5.  Click the "Start Sensors" button and grant the necessary permissions when prompted.
6.  You should now see the 3D model rotate as you move your phone.
