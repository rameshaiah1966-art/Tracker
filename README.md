# Device Orientation 3D Visualizer

This web application uses your device's sensors (specifically the accelerometer and gyroscope) to determine its orientation in real-time and displays it using a 3D model in your browser.

## Features

-   **Absolute Orientation Tracking:** Uses the `AbsoluteOrientationSensor` to align the 3D model with the Earth's coordinate system (Z-axis points up from gravity, other axes are compass-aligned).
-   **3D Position Tracking & Path Tracing:**
    -   Calculates the device's position in 3D space by integrating accelerometer data.
    -   Draws a red line in the 3D scene to trace the calculated path of the device.
    -   Displays the calculated X, Y, and Z distance from the starting point in a dedicated UI panel.
    -   Includes a "Reset Position & Trace" button to reset the calculation, which is necessary to manage sensor drift.
-   **Velocity Plotting:** Visualizes angular and linear velocity in real-time using bar graphs.
-   **Scene Helpers:** Includes a grid and XYZ axes to provide a clear frame of reference for orientation and movement.
-   **Dynamic Camera:** The camera automatically pans and zooms to keep the entire movement path in view.
-   **Responsive:** The 3D scene adapts to the window size.

### Important Limitation: Position Tracking Accuracy

Calculating position from phone sensors (IMU) is a classic engineering problem. Even tiny, unavoidable errors in the sensor readings accumulate very quickly, causing the calculated position to "drift" away from the true position.

To combat this, this application implements a **Zero-Velocity Update (ZUPT) filter**. This filter detects when the device is being held still and resets the calculated velocity to zero, preventing drift when the device is not moving.

While this makes the position tracking much more stable, **some drift during active movement is still unavoidable**. The ZUPT filter does not correct for errors that accumulate while the device is in motion. The "Reset Position & Trace" button is provided to clear the calculated position and start fresh.

## How to Run

Accessing device sensors from a browser has a strict security requirement: **the page must be served over a secure context (HTTPS).** You cannot simply open the `index.html` file in your browser from the local filesystem.

Here's how to set up a simple local HTTPS server to run this application.

### Prerequisites

-   [Node.js and npm](https://nodejs.org/en/) installed on your computer.
-   [OpenSSL](https://www.openssl.org/) command-line tool installed.
    -   **macOS/Linux:** OpenSSL is pre-installed.
    -   **Windows:** The easiest way to get OpenSSL is to install [Git for Windows](https://git-scm.com/download/win) and use the included **Git Bash** terminal, which has OpenSSL built-in.

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

## Troubleshooting

### Symptom: The "Start Sensors" button is clicked, but nothing happens.

If you click the button and the 3D model does not start moving, and you are not prompted for any permissions, here are the most likely causes:

1.  **Not Using HTTPS:** The browser will silently fail to access sensors if the page is not loaded over a secure `https://` connection.
    -   **Solution:** Make sure the URL in your browser's address bar starts with `https://` and not `http://` or `file://`. Follow the instructions above to use the `http-server --ssl` command.

2.  **Sensor Permissions are Blocked:** You may have previously denied sensor access for this site, or your browser may be configured to block them by default.
    -   **Solution:**
        -   In your browser, click the padlock icon in the address bar next to the URL.
        -   Go to "Site settings" or "Permissions".
        -   Find the "Sensors" or "Motion Sensors" permission and make sure it is set to "Allow".
        -   Reload the page and try again.

3.  **Browser or Device Not Supported:** The Web Sensor APIs are modern features and may not be supported on all browsers or devices.
    -   **Solution:** This application works best on up-to-date versions of Chrome or Firefox on a modern smartphone (Android or iOS). It may not work on desktop browsers (as they lack the required sensors) or on older mobile browsers.

4.  **Secure Context Error (on mobile):** When accessing the server from your phone, you must use the `https://` URL. If you accepted the security warning on your computer but not on your phone, it will not work.
    -   **Solution:** Ensure you have navigated to `https://<your-computer-ip>:8080/client/index.html` on your phone's browser and have accepted the security warning there as well.
